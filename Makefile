# spenicle — developer entry points.
#
# Lint is split into four groups because they fail for different reasons and
# deserve different reactions: correctness blocks, security blocks, style asks,
# performance informs. Each group has its own config in tools/lint/.

GO      ?= go
GOLANGCI := golangci-lint
BIN     := bin/spenicle
LINTDIR := tools/lint

.PHONY: help build run test bdd cover lint lint-correctness lint-style lint-security lint-performance lint-fix fmt lint-check-union

help: ## show targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## compile the single binary
	$(GO) build -o $(BIN) ./cmd/spenicle

run: ## run locally against ./data
	DATA_DIR=./data ADDR=:8080 $(GO) run ./cmd/spenicle

test: ## unit and integration tests
	$(GO) test ./... -count=1

bdd: ## only the Gherkin suite, verbose
	$(GO) test ./internal/bdd/ -count=1 -v

cover: ## coverage report over the whole module
	$(GO) test ./... -count=1 -coverprofile=coverage.out
	$(GO) tool cover -func=coverage.out | tail -1

fmt: ## gofmt the tree
	$(GO) fmt ./...

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
