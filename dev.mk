# dev.mk — the local development loop, standalone.
#
# Included by the root Makefile (so `make dev` works like any other target) and usable on its
# own for the one workflow it owns: two processes on one database, plus the SPA dev server.
#
#   make -f dev.mk dev        # or: make dev
#
# APP_SECRET is the only thing a run needs, and it is the caller's to export so a restart keeps
# the same sealed settings: `export APP_SECRET=$(openssl rand -base64 32)`.
GO   ?= go
BIN  ?= bin/spenicle
PORT ?= 8080

.PHONY: dev dev-api dev-worker dev-web dev-build

dev: ## run the API and the worker in one process against ./data
	$(GO) run . all

dev-api: ## run only the API (the sole listener) against ./data
	$(GO) run . http

dev-worker: ## run only the worker: recurring captures, retention, exports, intake
	$(GO) run . worker

dev-web: ## the SPA dev server on :5173, proxying /api to the API
	cd web && pnpm install --frozen-lockfile && pnpm run dev

dev-build: ## build the binary with the SPA embedded, then serve one origin on :8080
	cd web && pnpm install --frozen-lockfile && pnpm run build
	$(GO) build -tags web -o $(BIN) .
	@echo "built $(BIN) with web/dist embedded: ./$(BIN) all"
