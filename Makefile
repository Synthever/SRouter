# The repo root has no Cargo.toml, so every cargo target carries
# --manifest-path, and each recipe is the command CONTRIBUTING.md documents.
# `make` alone prints this list; nothing here has a hidden default.

IMAGE ?= srouter:latest

.PHONY: help run build test test-one fmt fmt-check lint check bindings web web-dev image up down logs

help:
	@echo "run        cargo run from server/, so server/.env applies"
	@echo "build      cargo build --release --locked"
	@echo "test       cargo test --locked (the whole suite)"
	@echo "test-one   make test-one SUITE=chat_completions"
	@echo "fmt        cargo fmt"
	@echo "fmt-check  cargo fmt -- --check"
	@echo "lint       clippy --all-targets --all-features -D warnings"
	@echo "check      fmt-check + lint + test"
	@echo "bindings   regenerate server/bindings.ts and client/src/generated/typed.ts"
	@echo "web        bun install --frozen-lockfile + bun run build (the dist for WEB_DIST_PATH)"
	@echo "web-dev    vite dev server on :5173, proxying /v1"
	@echo "image      docker build -t $(IMAGE) ."
	@echo "up         docker compose up -d --build"
	@echo "down       docker compose down"
	@echo "logs       docker compose logs -f"

run:
	cd server && cargo run

build:
	cargo build --manifest-path server/Cargo.toml --release --locked

test:
	cargo test --manifest-path server/Cargo.toml --locked

test-one:
	cargo test --manifest-path server/Cargo.toml --test $(SUITE)

fmt:
	cargo fmt --manifest-path server/Cargo.toml

fmt-check:
	cargo fmt --manifest-path server/Cargo.toml -- --check

lint:
	cargo clippy --manifest-path server/Cargo.toml --all-targets --all-features --locked -- -D warnings

check: fmt-check lint test

bindings:
	cargo run --manifest-path server/Cargo.toml --bin export_ts

web:
	cd client && bun install --frozen-lockfile && bun run build

web-dev:
	cd client && bun run dev

image:
	docker build -t $(IMAGE) .

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f
