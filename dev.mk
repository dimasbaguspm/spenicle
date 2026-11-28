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
# One secret per checkout, generated once: `APP_SECRET=$(openssl rand …)` inline mints a new key
# on every run, and the database's sealed settings are useless under a different one. An exported
# APP_SECRET still wins.
SECRET_FILE ?= .dev-secret

.PHONY: dev dev-api dev-worker dev-web dev-build web-dist dev-secret

# The SPA is embedded only with `-tags web`, so the dev binary needs web/dist to exist — and
# a stale web/dist is a stale UI with no warning: `go run -tags web` happily embeds yesterday's
# bundle. Rebuild whenever a source is newer than the built index, not only when it is missing.
WEB_SOURCES ?= web/src web/public web/index.html web/package.json web/pnpm-lock.yaml \
	web/vite.config.ts web/tsconfig.json

web-dist: ## build web/dist when a source is newer than the bundle (the embed needs it)
	@sh -c 'test -f web/dist/index.html \
		&& test -z "$$(find $(WEB_SOURCES) -newer web/dist/index.html -print -quit 2>/dev/null)" \
		|| { echo "web/dist is stale: rebuilding the SPA"; cd web && pnpm install --frozen-lockfile && pnpm run build; }'

dev-secret: ## create the stable dev APP_SECRET once (.dev-secret)
	@test -s $(SECRET_FILE) || (openssl rand -base64 32 > $(SECRET_FILE) && chmod 600 $(SECRET_FILE) && echo "wrote $(SECRET_FILE)")

dev: web-dist dev-secret ## run the API and the worker in one process, SPA served on :8080
	@APP_SECRET="$${APP_SECRET:-$$(cat $(SECRET_FILE))}" $(GO) run -tags web . all

dev-api: web-dist dev-secret ## run only the API (the sole listener, SPA served) against ./data
	@APP_SECRET="$${APP_SECRET:-$$(cat $(SECRET_FILE))}" $(GO) run -tags web . http

dev-worker: dev-secret ## run only the worker: recurring captures, retention, exports, intake
	@APP_SECRET="$${APP_SECRET:-$$(cat $(SECRET_FILE))}" $(GO) run . worker

dev-web: ## the SPA dev server on :5173, proxying /api to the API
	cd web && pnpm install --frozen-lockfile && pnpm run dev

dev-build: ## build the binary with the SPA embedded, then serve one origin on :8080
	cd web && pnpm install --frozen-lockfile && pnpm run build
	$(GO) build -tags web -o $(BIN) .
	@echo "built $(BIN) with web/dist embedded: ./$(BIN) all"
