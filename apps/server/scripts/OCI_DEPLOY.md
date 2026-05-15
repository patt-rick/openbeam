# Deploying openbeam-server to Oracle Cloud (Always Free)

This is the deployment path used when you need more RAM than Render's 512 MB
free tier — specifically so `data/embeddings.bin` (486 MB) can be loaded into
memory and semantic detection works.

Target: Oracle Cloud Infrastructure (OCI) Always Free Ampere A1 VM —
4 OCPU / 24 GB RAM / Ubuntu 22.04 ARM64. Total cost: $0/month, forever.

Total time: ~45 min. Most of it is the Rust compile running in the background.

---

## Phase 0 — Push the scripts to GitHub

The bootstrap script lives at
`apps/server/scripts/oci-bootstrap.sh` and is fetched onto the VM via
`curl ... | bash`. So it must be on a branch GitHub can serve. The commands
below assume the `production` branch.

If the scripts aren't pushed yet:

```powershell
git push origin production
```

---

## Phase 1 — Generate an SSH key on your laptop (2 min)

Windows 10/11 has OpenSSH built in. In PowerShell:

```powershell
ssh-keygen -t ed25519 -C "openbeam-oci"
```

- File path: press **Enter** to accept the default
  (`C:\Users\<you>\.ssh\id_ed25519`).
- Passphrase: press **Enter** twice to skip, or set one.

Then show the **public** key so you can paste it into OCI:

```powershell
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

Copy the whole `ssh-ed25519 AAAA...` line. Keep this window open.

---

## Phase 2 — Create the OCI account (5 min)

1. Go to https://cloud.oracle.com → **Start for free**.
2. Fill in details. ⚠️ **Home Region is permanent** — pick one close to you
   (e.g. London, Frankfurt, Ashburn).
3. Credit card is required for identity verification; it is not charged for
   Always Free resources.
4. Log into the OCI Console.

---

## Phase 3 — Create the VM (10 min, with possible retries)

1. OCI Console search bar → **Instances** (under Compute) → **Create instance**.
2. Fill the form:
   - **Name:** `openbeam-server`
   - **Image:** Edit → **Canonical Ubuntu 22.04** → Select.
   - **Shape:** Edit → **Ampere** tab → **VM.Standard.A1.Flex** →
     **OCPUs: 4**, **Memory: 24 GB** → Select.
   - **Networking:** keep defaults; ensure **Assign a public IPv4 address** is
     checked.
   - **SSH keys:** **Paste public keys** → paste the `ssh-ed25519 AAAA...` line.
   - **Boot volume:** default (47 GB free).
3. Click **Create**.

⚠️ **Out of host capacity.** Ampere A1 is heavily oversubscribed in popular
regions. If you see this error:

- Wait an hour and retry.
- Try a different Availability Domain in the same region.
- Last resort: pick a different home region (requires recreating the account).

Once the instance shows **Running**, copy the **Public IP Address** from the
instance detail page (looks like `158.101.23.45`).

---

## Phase 4 — Open ports 80 and 443 (3 min, easy to miss)

OCI does **not** open these by default. Without this step, Caddy can't get a
TLS cert and the server is unreachable.

1. On the instance detail page → **Primary VNIC** → click the **Subnet** link.
2. On the subnet page → click the **Security List** (usually named
   `Default Security List for vcn-...`).
3. **Add Ingress Rules** → add **two** rules:

   | Source CIDR | Protocol | Destination Port |
   |---|---|---|
   | `0.0.0.0/0` | TCP | `80` |
   | `0.0.0.0/0` | TCP | `443` |

4. Click **Add Ingress Rules** to save.

---

## Phase 5 — First SSH in (2 min)

```powershell
ssh ubuntu@<PUBLIC_IP>
```

- Type `yes` to accept the host fingerprint.
- You should land at `ubuntu@openbeam-server:~$`.

If you get `Permission denied (publickey)`, you pasted the wrong key — make
sure it was the `.pub` file.

---

## Phase 6 — Run the bootstrap script (10 min, mostly Rust compiling)

From the SSH session:

```bash
curl -fsSL https://raw.githubusercontent.com/tensorkithq/openbeam/production/apps/server/scripts/oci-bootstrap.sh | bash
```

This installs Caddy, Rust, clones the repo, builds the release binary,
installs the systemd unit and Caddyfile. ~7–10 min on Ampere.

When it finishes, the last lines print your sslip.io hostname
(e.g. `158-101-23-45.sslip.io`). **Note it** — you'll use it twice more.

---

## Phase 7 — Copy embeddings up from your laptop (5–10 min)

⚠️ Open a **second** PowerShell window — don't close the SSH one.

```powershell
cd "C:\Users\Patrick Ackom\Desktop\repos\openbeam"
scp apps\server\data\embeddings.bin     ubuntu@<PUBLIC_IP>:~/openbeam/apps/server/data/
scp apps\server\data\embeddings-ids.bin ubuntu@<PUBLIC_IP>:~/openbeam/apps/server/data/
```

The big one is 486 MB. Time depends on your upload bandwidth.

---

## Phase 8 — Set the API key and start the server (2 min)

Back in the SSH window:

```bash
sudo nano /etc/openbeam.env
```

Find `OPENROUTER_API_KEY=` and paste your key after the `=` (no quotes).
Save with `Ctrl+O` → `Enter` → `Ctrl+X`.

Start it:

```bash
sudo systemctl start openbeam-server
sudo journalctl -u openbeam-server -f
```

Look for:

```
Vector index loaded: 31096 vectors
Semantic search enabled with API embedder
OpenBeam server listening on http://0.0.0.0:4001
```

`Ctrl+C` to stop tailing (the server keeps running).

---

## Phase 9 — Verify HTTPS (1 min)

```powershell
curl https://<your-sslip-hostname>/api/health
```

You should see JSON with `"semantic": true`.

⚠️ First request after a new hostname can take 10–30 s while Caddy
negotiates the Let's Encrypt cert. After that it's instant.

If `semantic` is `false`, the embeddings file isn't where the server
expects. Recheck the `scp` destination path in Phase 7.

---

## Phase 10 — Point Cloudflare Pages at the new server (3 min)

1. Cloudflare dashboard → **Workers & Pages** → your openbeam project →
   **Settings** → **Environment variables**.
2. Edit `VITE_API_URL` (Production) → `https://<your-sslip-hostname>`
   (no trailing slash).
3. **Deployments** tab → latest deployment → **⋯** → **Retry deployment**,
   or push any commit to trigger a fresh build.
4. Once the build finishes, open your `openbeam.pages.dev` URL and confirm
   semantic detection works in a sermon.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Permission denied (publickey)` on SSH | Pasted private key instead of public | Re-add SSH key in OCI; must be `id_ed25519.pub` |
| `curl` to sslip.io URL times out | Ports 80/443 not opened in VCN | Redo Phase 4 |
| `/api/health` shows `"semantic": false` | Embeddings not on disk | Recheck scp path in Phase 7 |
| Caddy can't get a cert | DNS/port issue | `sudo journalctl -u caddy -n 50` |
| `Out of host capacity` on instance create | Ampere A1 oversubscribed in region | Retry later or change Availability Domain |
| Server crashes / restarts repeatedly | Missing `OPENROUTER_API_KEY` or bad path | `sudo journalctl -u openbeam-server -n 100` |

## Useful commands on the VM

```bash
sudo systemctl status openbeam-server    # is it running?
sudo systemctl restart openbeam-server   # after editing /etc/openbeam.env
sudo journalctl -u openbeam-server -f    # tail server logs
sudo journalctl -u caddy -f              # tail Caddy logs
cd ~/openbeam && git pull && cargo build --release -p openbeam-server \
  && sudo systemctl restart openbeam-server    # deploy a new version
```
