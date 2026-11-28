GO     := go
LINT   := golangci-lint
BIN    := bin/spenicle
WEB    := web
DATA   := data
PORT   := 8080
DIST   := $(WEB)/dist/index.html
SECRET := .dev-secret
SRC    := $(WEB)/src $(WEB)/public $(WEB)/index.html $(WEB)/package.json \
	$(WEB)/pnpm-lock.yaml $(WEB)/vite.config.ts $(WEB)/tsconfig.json

.DEFAULT_GOAL := help
.PHONY: help hooks build dev dev-api dev-worker dev-web web web-dist web-check \
	web-types test uat uat-snapshots cover fmt openapi mocks lint lint-fix \
	lint-correctness lint-style lint-security lint-performance dev-secret \
	stop fresh check-fresh

help:
	@grep -oE '^[a-z][a-z-]+:' $(MAKEFILE_LIST) | tr -d : \
		| grep -vE '^(help|web-dist|dev-secret)$$' | tr '\n' ' ' | fold -s -w 96; echo

hooks:
	lefthook install

build:
	$(GO) build -o $(BIN) .

# the listener is a single process on a single port: a stale one from another checkout
# keeps answering with its own database, so free the port and prove the state first
stop:
	@ss -ltnpH "sport = :$(PORT)" 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u \
		| while read -r pid; do \
			echo "stopping pid $$pid on :$(PORT) (cwd $$(readlink /proc/$$pid/cwd 2>/dev/null))" >&2; \
			kill $$pid 2>/dev/null || true; \
		done; true

fresh: stop web
	rm -rf $(DATA)
	@echo "fresh: $(DATA) removed and web/dist rebuilt, starting the unclaimed instance" >&2
	@$(MAKE) -s dev

check-fresh:
	@body=$$(curl -fsS --noproxy '*' --max-time 5 http://127.0.0.1:$(PORT)/api/bootstrap) || { \
		echo "FAIL: no API on :$(PORT) — start make dev first" >&2; exit 1; }; \
	printf '%s\n' "$$body"; \
	case "$$body" in \
		*'"setup_completed":false'*) echo "ok: unclaimed starting point";; \
		*) echo "FAIL: this instance is claimed; the listener is not the fresh $(DATA)" >&2; exit 1;; \
	esac

dev: web-dist dev-secret
	@APP_SECRET="$${APP_SECRET:-$$(cat $(SECRET))}" $(GO) run -tags web . all

dev-api: web-dist dev-secret
	@APP_SECRET="$${APP_SECRET:-$$(cat $(SECRET))}" $(GO) run -tags web . http

dev-worker: dev-secret
	@APP_SECRET="$${APP_SECRET:-$$(cat $(SECRET))}" $(GO) run . worker

dev-web:
	cd $(WEB) && pnpm install --frozen-lockfile && pnpm run dev

web:
	cd $(WEB) && pnpm install --frozen-lockfile && pnpm run build

web-dist:
	@test -f $(DIST) && test -z "$$(find $(SRC) -newer $(DIST) -print -quit)" || $(MAKE) -s web

dev-secret:
	@test -s $(SECRET) || (openssl rand -base64 32 > $(SECRET) && chmod 600 $(SECRET))

web-check:
	cd $(WEB) && pnpm run typecheck && pnpm run lint && pnpm run fmt:check && pnpm test

web-types:
	cd $(WEB) && pnpm run api:types

test:
	$(GO) test $$($(GO) list ./... | grep -v /uat) -count=1

uat:
	$(GO) test ./uat -count=1 -v

uat-snapshots:
	UAT_UPDATE_SNAPSHOTS=1 $(GO) test ./uat -count=1

cover:
	$(GO) test ./... -count=1 -coverpkg=./... -coverprofile=coverage.out
	$(GO) tool cover -func=coverage.out | tail -1

fmt:
	$(GO) fmt ./...

openapi:
	$(GO) run ./tools/openapi

mocks:
	$(GO) generate ./...

lint: lint-correctness lint-style lint-security lint-performance

lint-correctness:
	$(LINT) run -c tools/lint/correctness.yml ./...

lint-style:
	$(LINT) run -c tools/lint/style.yml ./...

lint-security:
	$(LINT) run -c tools/lint/security.yml ./...

lint-performance:
	$(LINT) run -c tools/lint/performance.yml ./...

lint-fix:
	$(LINT) run -c tools/lint/style.yml --fix ./...
	$(LINT) run -c tools/lint/correctness.yml --fix ./...
