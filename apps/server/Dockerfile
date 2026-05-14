# ---- build stage ----
FROM rust:slim AS builder
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
