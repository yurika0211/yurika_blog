FROM rust:1.88-bookworm AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY webservice/Cargo.toml webservice/Cargo.toml
COPY db/Cargo.toml db/Cargo.toml

RUN mkdir -p webservice/src/bin db/src && \
    echo "fn main() {}" > webservice/src/bin/blog_service.rs && \
    echo "" > webservice/src/lib.rs && \
    echo "" > db/src/lib.rs && \
    cargo build --release --bin blog_service && \
    rm -rf webservice/src db/src

COPY webservice/ webservice/
COPY db/ db/

RUN touch webservice/src/bin/blog_service.rs && \
    cargo build --release --bin blog_service

FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/blog_service .

ENV DATABASE_URL=""

EXPOSE 3001

CMD ["./blog_service"]
