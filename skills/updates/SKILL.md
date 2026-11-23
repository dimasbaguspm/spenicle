---
name: updates
description: Check Spenicle for Go, module, GitHub Actions and container image updates, and apply them safely.
---

# Updates

Four things age independently: the Go toolchain, the Go modules, the GitHub
Actions pins, and the published image. Check them in that order.

## 1. Go toolchain

```bash
go version                # must match the `go` line in go.mod (1.26.x)
head -3 go.mod            # module, go, toolchain
```

`Dockerfile` pins `golang:1.26-alpine`. A toolchain bump is a normal `chore` commit
that touches `go.mod`, the Dockerfile, and CI's `go-version-file` (it reads go.mod,
so nothing else). Run `make test` and `make lint` before pushing.

## 2. Go modules

```bash
go list -m -u all | grep '\['        # modules with a newer version
go get -u ./...                      # apply
go mod tidy
make test && make lint
git diff go.mod go.sum                # read it: one major bump per commit if possible
```

Guard rails: `modernc.org/sqlite` is the database, `go.opentelemetry.io/otel` is
telemetry, `github.com/cucumber/godog` is the UAT suite. A major bump of any of
those needs its own commit and its own green CI run — they are load-bearing.

## 3. GitHub Actions

```bash
grep -rn "uses: " .github/workflows/
gh api repos/dimasbaguspm/spenicle/actions/workflows --jq '.workflows[].path'
# or, if installed:
# actionlint .github/workflows/*.yml
```

Bump `actions/checkout`, `actions/setup-go`, `docker/setup-{qemu,buildx}-action`,
`docker/build-push-action` together with the workflow that uses them. Always run:

```bash
actionlint .github/workflows/release.yml .github/workflows/ci.yml
```

## 4. The published image

```bash
docker pull ghcr.io/dimasbaguspm/spenicle:latest
docker run --rm -e APP_SECRET=0123456789abcdef \
  -p 8080:8080 ghcr.io/dimasbaguspm/spenicle:latest &
curl -s localhost:8080/healthz          # version = vX.Y.Z+sha7
```

Compare `version` with the newest tag (`git describe --tags --abbrev=0`). If the
image is older, someone forgot to tag; the fix is a release, not a rebuild.

## 5. Docs drift

An update is also a chance to catch drift. Check:

- `README.md` env table vs `internal/common/config/config.go`
- `AGENTS.md` layout vs `find . -type d -name internal -prune -o -type f -name '*.go' -print | head -40`
- `.env.example` vs the same constants
- this folder's skills vs the commands they quote

## Done means

- `go build ./... && make test && make lint` green
- `actionlint` clean on every workflow
- versions in `go.mod`, `Dockerfile`, `.github/workflows/*` agree
- commit is `chore:` (or `fix:` when the bump fixes a real bug), one dependency
  family per commit
