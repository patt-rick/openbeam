#!/usr/bin/env bash
# Bootstrap a GCP e2-micro VM (Ubuntu 22.04 x86_64) for openbeam-server.
#
# Usage on a fresh VM, as the default login user:
#   curl -fsSL https://raw.githubusercontent.com/patt-rick/openbeam/production/apps/server/scripts/gcp-bootstrap.sh | bash
#
# Or after `git clone`:
#   bash apps/server/scripts/gcp-bootstrap.sh
#
# What this does (idempotent):
#   1. Creates a 4 GB swapfile (required — release build OOMs on 1 GB RAM)
#   2. Installs build deps + Caddy via apt
#   3. Installs rustup + stable toolchain for the current user
#   4. Clones the repo to ~/openbeam if missing
#   5. Builds the server release binary with CARGO_BUILD_JOBS=1 (low-mem)
#   6. Installs the systemd unit + Caddyfile and reloads/enables them
#
# Required after this script:
#   - scp data/embeddings.bin + data/embeddings-ids.bin to ~/openbeam/apps/server/data/
#   - Edit /etc/openbeam.env to set OPENROUTER_API_KEY
#   - Open TCP 80 + 443 in the GCP firewall (gcloud compute firewall-rules
#     create openbeam-http --allow=tcp:80,tcp:443 --source-ranges=0.0.0.0/0)
#
# Hostname: by default this script picks a sslip.io name derived from the
# VM's public IP (e.g. 35-200-1-2.sslip.io) so no DNS setup is needed.
# Override with: OPENBEAM_HOSTNAME=your.domain.example bash gcp-bootstrap.sh

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/patt-rick/openbeam.git}"
REPO_BRANCH="${REPO_BRANCH:-production}"
REPO_DIR="${REPO_DIR:-$HOME/openbeam}"
SERVER_DIR="$REPO_DIR/apps/server"
SERVICE_USER="${SUDO_USER:-${USER}}"

if [[ $EUID -eq 0 ]]; then
  echo "Run as the unprivileged login user, not root. The script will sudo where needed." >&2
  exit 1
fi

echo "==> swap: ensure 4 GB swapfile (release build needs ~2-3 GB peak; e2-micro has 1 GB RAM)"
if ! swapon --show=NAME --noheadings | grep -q '/swapfile'; then
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  if ! grep -q '^/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  fi
  # Bias toward keeping the embeddings working set in RAM, push other pages to swap.
  echo 'vm.swappiness=20' | sudo tee /etc/sysctl.d/99-openbeam-swap.conf >/dev/null
  sudo sysctl -p /etc/sysctl.d/99-openbeam-swap.conf
fi

echo "==> apt: build deps + Caddy"
sudo apt-get update
sudo apt-get install -y --no-install-recommends \
  build-essential pkg-config libssl-dev libsqlite3-dev ca-certificates curl git \
  debian-keyring debian-archive-keyring apt-transport-https
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

echo "==> repo at $REPO_DIR (branch: $REPO_BRANCH)"
if [[ ! -d "$REPO_DIR/.git" ]]; then
  git clone --branch "$REPO_BRANCH" "$REPO_URL" "$REPO_DIR"
else
  git -C "$REPO_DIR" fetch origin "$REPO_BRANCH"
  git -C "$REPO_DIR" checkout "$REPO_BRANCH"
  git -C "$REPO_DIR" pull --ff-only origin "$REPO_BRANCH"
fi

echo "==> cargo build --release (single-job, ~25-40 min on e2-micro with swap)"
( cd "$SERVER_DIR" && CARGO_BUILD_JOBS=1 cargo build --release )

echo "==> install /etc/openbeam.env (if missing)"
if [[ ! -f /etc/openbeam.env ]]; then
  sudo tee /etc/openbeam.env >/dev/null <<EOF
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
  PUBLIC_IP="$(curl -fsSL --max-time 5 -H 'Metadata-Flavor: Google' \
    http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip \
    || curl -fsSL --max-time 5 https://api.ipify.org \
    || true)"
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
  1. From your laptop, scp the embeddings up:
       scp apps/server/data/embeddings.bin     $SERVICE_USER@$OPENBEAM_HOSTNAME:~/openbeam/apps/server/data/
       scp apps/server/data/embeddings-ids.bin $SERVICE_USER@$OPENBEAM_HOSTNAME:~/openbeam/apps/server/data/
  2. Edit /etc/openbeam.env to set OPENROUTER_API_KEY
  3. Open TCP 80 + 443 in the GCP firewall (Console: VPC network →
     Firewall → Create firewall rule; or via gcloud:
       gcloud compute firewall-rules create openbeam-http \\
         --allow=tcp:80,tcp:443 --source-ranges=0.0.0.0/0)
  4. Start the server:
       sudo systemctl start openbeam-server
       journalctl -u openbeam-server -f
  5. Verify:
       curl https://$OPENBEAM_HOSTNAME/api/health
EOF
