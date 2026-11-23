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

**The Node runtime is decided by the action, not by us.** GitHub ships `node20` and
`node24`; there is no `node26`. A "targets Node 20" annotation means the action's own
`runs.using` is old — the fix is a newer major, and the way to check is the action
itself:

```bash
gh api "repos/docker/build-push-action/contents/action.yml?ref=v7.4.0" \
  --jq .content | base64 -d | grep -A2 '^runs:'
```

Pinned today (all `node24`): `actions/checkout@v7`, `actions/setup-go@v7`,
`golangci/golangci-lint-action@v8`, `docker/setup-qemu-action@v4`,
`docker/setup-buildx-action@v4`, `docker/build-push-action@v7`.

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
