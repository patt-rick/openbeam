#!/usr/bin/env bash
# Bootstrap an OCI Ampere A1 VM (Ubuntu 22.04 ARM64) for openbeam-server.
#
# Usage on a fresh VM, as the `ubuntu` user:
#   curl -fsSL https://raw.githubusercontent.com/patt-rick/openbeam/production/apps/server/scripts/oci-bootstrap.sh | bash
#
# Or after `git clone`:
#   bash apps/server/scripts/oci-bootstrap.sh
#
# What this does (idempotent):
#   1. Installs build deps + Caddy via apt
#   2. Installs rustup + stable toolchain for the `ubuntu` user
#   3. Clones the repo to ~/openbeam if missing
#   4. Builds the server release binary (`cargo build --release -p openbeam-server`)
#   5. Installs the systemd unit + Caddyfile and reloads/enables them
#
# Required after this script:
#   - scp data/embeddings.bin + data/embeddings-ids.bin to /home/ubuntu/openbeam/apps/server/data/
#   - Edit /etc/openbeam.env to set OPENROUTER_API_KEY
#   - Open TCP 80 + 443 in the VCN security list (OCI does NOT auto-open them)
#
# Hostname: by default this script picks a sslip.io name derived from the
# VM's public IP (e.g. 1-2-3-4.sslip.io) — no DNS setup needed. Override
# with: OPENBEAM_HOSTNAME=your.domain.example bash oci-bootstrap.sh

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/patt-rick/openbeam.git}"
REPO_DIR="${REPO_DIR:-$HOME/openbeam}"
SERVER_DIR="$REPO_DIR/apps/server"
SERVICE_USER="${SUDO_USER:-${USER:-ubuntu}}"

if [[ $EUID -eq 0 ]]; then
  echo "Run as the unprivileged user (e.g. ubuntu), not root. The script will sudo where needed." >&2
  exit 1
fi

echo "==> apt: build deps + Caddy"
sudo apt-get update
sudo apt-get install -y --no-install-recommends \
  build-essential pkg-config libssl-dev libsqlite3-dev ca-certificates curl git \
  debian-keyring debian-archive-keyring apt-transport-https
# Caddy official repo (provides arm64 builds)
if ! command -v caddy >/dev/null 2>&1; then
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
    | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
    | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y caddy
fi

echo "==> rustup toolchain"
if ! command -v cargo >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
fi
# shellcheck disable=SC1090
source "$HOME/.cargo/env"

echo "==> repo at $REPO_DIR"
if [[ ! -d "$REPO_DIR/.git" ]]; then
  git clone "$REPO_URL" "$REPO_DIR"
else
  git -C "$REPO_DIR" pull --ff-only
fi

echo "==> cargo build --release -p openbeam-server"
( cd "$SERVER_DIR" && cargo build --release )

echo "==> install /etc/openbeam.env (if missing)"
if [[ ! -f /etc/openbeam.env ]]; then
  sudo tee /etc/openbeam.env >/dev/null <<EOF
# OpenBeam server runtime config — edit OPENROUTER_API_KEY before starting.
HOST=127.0.0.1
PORT=4001
DB_PATH=$SERVER_DIR/data/openbeam.db
RUST_LOG=info
OPENROUTER_API_KEY=
EOF
  sudo chmod 600 /etc/openbeam.env
  echo "    created /etc/openbeam.env — edit it to set OPENROUTER_API_KEY"
fi

echo "==> install systemd unit"
sudo install -m 0644 "$SERVER_DIR/scripts/openbeam-server.service" /etc/systemd/system/openbeam-server.service
sudo sed -i "s|__USER__|$SERVICE_USER|g; s|__SERVER_DIR__|$SERVER_DIR|g" /etc/systemd/system/openbeam-server.service
sudo systemctl daemon-reload
sudo systemctl enable openbeam-server

echo "==> resolve hostname for Caddy"
if [[ -z "${OPENBEAM_HOSTNAME:-}" ]]; then
  PUBLIC_IP="$(curl -fsSL --max-time 5 https://api.ipify.org || true)"
  if [[ -z "$PUBLIC_IP" ]]; then
    echo "Could not auto-detect public IP. Set OPENBEAM_HOSTNAME and re-run." >&2
    exit 1
  fi
  OPENBEAM_HOSTNAME="${PUBLIC_IP//./-}.sslip.io"
fi
echo "    using hostname: $OPENBEAM_HOSTNAME"

echo "==> install Caddyfile"
sudo install -m 0644 "$SERVER_DIR/scripts/Caddyfile" /etc/caddy/Caddyfile
sudo sed -i "s|__HOSTNAME__|$OPENBEAM_HOSTNAME|g" /etc/caddy/Caddyfile
sudo systemctl reload caddy || sudo systemctl restart caddy

cat <<EOF

==> Bootstrap complete. Hostname: $OPENBEAM_HOSTNAME

Next steps:
  1. scp the embeddings from your laptop:
       scp apps/server/data/embeddings.bin     ubuntu@$OPENBEAM_HOSTNAME:~/openbeam/apps/server/data/
       scp apps/server/data/embeddings-ids.bin ubuntu@$OPENBEAM_HOSTNAME:~/openbeam/apps/server/data/
  2. Edit /etc/openbeam.env to set OPENROUTER_API_KEY
  3. Open the VCN security list to allow ingress 80/tcp and 443/tcp
  4. Start the server:
       sudo systemctl start openbeam-server
       journalctl -u openbeam-server -f
  5. Verify:
       curl https://$OPENBEAM_HOSTNAME/api/health
  6. In Cloudflare Pages, set VITE_API_URL=https://$OPENBEAM_HOSTNAME and redeploy.
EOF
