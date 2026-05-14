# Deploying OpenBeam for free

This guide deploys OpenBeam at **$0 hosting cost** using:

- **Hugging Face Spaces** (Docker) — Rust backend, 16 GB free RAM, sleeps when idle
- **Cloudflare Pages** — React frontend, unlimited static hosting
- **OpenRouter** — embeddings API (the only paid piece; pennies per month at low usage)

Total setup time: ~30 minutes. Cold start after sleep: ~30–60 seconds.

---

## Part 1 — OpenRouter API key (5 min)

1. Go to <https://openrouter.ai> → **Sign In** (Google/GitHub).
2. Avatar (top-right) → **Credits** → **Add Credits** → buy $5 minimum.
3. Avatar → **Keys** → **Create Key** → name it `openbeam` → **copy the `sk-or-...` key**. You'll paste it in Part 2.

> At "really low" usage, $5 of credits lasts a very long time. Each transcription chunk gets embedded; expect well under $1/month.

---

## Part 2 — Backend on Hugging Face Spaces (15 min)

### 2a. Add a Dockerfile to your repo

Create `apps/server/Dockerfile`:

```dockerfile
# ---- build stage ----
FROM rust:1.82-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config libssl-dev libsqlite3-dev ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
COPY src ./src
RUN cargo build --release

# ---- runtime stage ----
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl3 libsqlite3-0 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/openbeam-server /app/openbeam-server
COPY data ./data
ENV HOST=0.0.0.0
ENV PORT=7860
ENV DB_PATH=/app/data/openbeam.db
ENV RUST_LOG=info
EXPOSE 7860
CMD ["/app/openbeam-server"]
```

Commit it:

```powershell
git add apps/server/Dockerfile
git commit -m "infra: add Dockerfile for HF Spaces"
```

### 2b. Create the Space

1. Sign up at <https://huggingface.co>.
2. Avatar → **New Space**.
3. Fill in:
   - **Space name:** `openbeam` (or anything)
   - **SDK:** **Docker** → **Blank**
   - **Hardware:** CPU basic (free)
   - **Visibility:** Public
4. Click **Create Space**.
5. On the new Space → **Settings** tab → **Variables and secrets** → **New secret**:
   - Name: `OPENROUTER_API_KEY`
   - Value: the `sk-or-...` key from Part 1
   - Save.

### 2c. Push the backend to the Space

The Space provides a git URL. From your repo root in PowerShell:

```powershell
git remote add hf https://huggingface.co/spaces/YOUR-USERNAME/openbeam
git subtree push --prefix=apps/server hf main
```

When prompted for a password, paste a **Hugging Face access token** (create at huggingface.co → Settings → Access Tokens → "write" role).

`apps/server/data/embeddings.bin` is already tracked in git LFS, so it uploads via LFS automatically (the ~500 MB upload takes a while).

### 2d. Wait for build

On the Space page → **Logs** tab. First build takes ~10–15 min (Rust compiles slowly). When you see `OpenBeam server listening on http://0.0.0.0:7860`, your Space is live at:

```
https://YOUR-USERNAME-openbeam.hf.space
```

Sanity-check: open `https://YOUR-USERNAME-openbeam.hf.space/api/health` in a browser.

---

## Part 3 — Frontend on Cloudflare Pages (10 min)

1. Sign up at <https://dash.cloudflare.com> (free, no credit card).
2. Left sidebar → **Workers & Pages** → **Create** → **Pages** tab → **Connect to Git**.
3. Authorize GitHub, pick your `openbeam` repo, click **Begin setup**.
4. Build settings:
   - **Production branch:** `main`
   - **Framework preset:** None
   - **Build command:** `npm install -g pnpm@9 && pnpm install --frozen-lockfile && pnpm --filter @openbeam/web build`
   - **Build output directory:** `apps/web/dist`
   - **Root directory:** leave blank
5. **Environment variables** → add two:
   - `VITE_API_URL` = `https://YOUR-USERNAME-openbeam.hf.space` (no trailing slash)
   - `NODE_VERSION` = `20`
6. **Save and Deploy**.

Build takes ~3–5 min. You'll get a URL like `https://openbeam-abc.pages.dev`. The frontend auto-converts `https://` → `wss://` from `VITE_API_URL`, so WebSockets just work.

---

## Runtime behavior

| Situation | What happens |
|---|---|
| First visit after idle | ~30–60s cold start (container wake + 486 MB embeddings load) |
| Subsequent requests | Instant |
| Idle for ~48 hours | HF Space sleeps; next visit triggers a cold start (not a rebuild) |
| Push frontend changes | Cloudflare auto-rebuilds |
| Push backend changes | Run `git subtree push --prefix=apps/server hf main` again |

---

## Why is `embeddings.bin` so big? (486 MB)

It's exactly **31,096 verses × 4,096 dimensions × 4 bytes/float = 509,575,168 bytes ≈ 486 MB**.

Three knobs control the size — all set in `apps/server/scripts/compute-embeddings.ts`:

| Knob | Current value | Effect |
|---|---|---|
| **Model dimension** | Qwen3-Embedding-**8B** → 4096-dim | Smaller `qwen3-embedding-0.6b` (1024-dim) would shrink the file ~4× to ~120 MB |
| **Precision** | float32 (4 bytes/value) | Quantizing to int8 shrinks another ~4× to ~30 MB with a small accuracy hit |
| **Coverage** | All ~31k verses across indexed translations | Could index only one translation, but loses cross-translation semantic matches |

It's a quality/size tradeoff Rhema made: smaller embeddings = worse semantic matches for paraphrases and allusions (the *"put on the full armor"* → Ephesians 6:11 type cases).

If you ever want a smaller deployment footprint, regenerating with `qwen3-embedding-0.6b` and int8 quantization would bring the file under 50 MB at the cost of some semantic recall.
