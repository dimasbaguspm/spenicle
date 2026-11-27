# spenicle — developer entry points.
#
# Lint is split into four groups because they fail for different reasons and
# deserve different reactions: correctness blocks, security blocks, style asks,
# performance informs. Each group has its own config in tools/lint/.
# CI runs them as four steps in one lint job, so each report survives.

GO      ?= go
GOLANGCI := golangci-lint
BIN     := bin/spenicle
LINTDIR := tools/lint

.PHONY: help hooks build run test uat uat-snapshots cover lint lint-correctness lint-style lint-security lint-performance lint-fix fmt openapi

help: ## show targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

hooks: ## install the git hooks (lefthook: build, lint, test, UAT before commit)
	lefthook install

build: ## compile the single binary
	$(GO) build -o $(BIN) .

run: ## run the API and the worker in one process against ./data
	$(GO) run . all

test: ## unit and integration tests (UAT has its own target)
	$(GO) test $$( $(GO) list ./... | grep -v '/uat' ) -count=1

uat: ## the Gherkin suite plus the containerised mock services (needs Docker)
	$(GO) test ./uat/ -count=1 -v

uat-snapshots: ## rewrite the UAT golden files, then review the diff
	UAT_UPDATE_SNAPSHOTS=1 $(GO) test ./uat/ -count=1

cover: ## coverage over the whole module, UAT and mocks included
	$(GO) test ./... -count=1 -coverpkg=./... -coverprofile=coverage.out
	$(GO) tool cover -func=coverage.out | tail -1

fmt: ## gofmt the tree
	$(GO) fmt ./...

openapi: ## regenerate the API document at the repo root
	$(GO) run ./tools/openapi

mocks:
	go generate ./...

lint: lint-correctness lint-style lint-security lint-performance ## run all four groups

lint-correctness: ## does the code do what it says
	$(GOLANGCI) run -c $(LINTDIR)/correctness.yml ./...

lint-style: ## is the code readable by the next person
	$(GOLANGCI) run -c $(LINTDIR)/style.yml ./...

lint-security: ## what can be abused if it is wrong
	$(GOLANGCI) run -c $(LINTDIR)/security.yml ./...

lint-performance: ## will this hold up at 10x the data
	$(GOLANGCI) run -c $(LINTDIR)/performance.yml ./...

lint-fix: ## apply the safe automatic fixes, then re-check
	$(GOLANGCI) run -c $(LINTDIR)/style.yml --fix ./...
	$(GOLANGCI) run -c $(LINTDIR)/correctness.yml --fix ./...
