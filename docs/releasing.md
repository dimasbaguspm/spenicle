# Releasing

Two workflows. CI runs on every push and pull request; release runs on a tag.

## CI

`.github/workflows/ci.yml` — two jobs, run in parallel:

| job | what |
|---|---|
| `build and test` | `go build ./...` then `go test ./... -count=1` |
| `lint (<group>)` | four parallel runners, one per lint group |

Speed comes from parallelism and caching, not from skipping things: Go module and
build caches are restored by `setup-go`, a second push to the same ref cancels the
first run, and the four lint groups never queue behind each other. A style failure
cannot hide a security failure because they are separate jobs.

## Release

`.github/workflows/release.yml` — triggered by a tag, or by hand.

```bash
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

Or Actions → release → Run workflow, type `v0.1.0`. The dispatched path creates and
pushes the tag itself, so a release is one click.

What it publishes:

1. **Binaries** — `spenicle_linux_amd64`, `linux_arm64`, `darwin_arm64` as `.tar.gz`,
   plus `checksums.txt`. Static: `CGO_ENABLED=0`.
2. **Container image** — `ghcr.io/<owner>/spenicle` tagged four ways:
   `<version>` (`v0.1.0`), `<version without v>` (`0.1.0`), `sha-<sha7>`, and `latest`.
3. **GitHub release** — notes list **every commit since the previous tag**, using
   `git describe --tags --abbrev=0 "<version>^"` as the base, so the notes always
   answer "what changed in this release".

## The version string carries the commit

The version compiled into the binary is `<tag>+<sha7>`:

```
v0.1.0+a72618d
```

- `-ldflags "-X main.version=..."` in both the release build and the Dockerfile.
- `/healthz` returns it, so a running container can be identified without inspecting
  the image tag: `{"status":"ok","version":"v0.1.0+a72618d", ...}`.

Rationale: a semver tag says what you intended to ship, the short hash says what you
actually shipped. Both matter when a container has been running for three months.

Docker tags cannot contain `+`, which is why the image uses `v0.1.0` and
`sha-<sha7>` separately instead of the combined string.

## Versioning policy

- `v0.x.y` while the ledger schema is still moving. Any release may change the schema;
  migrations run on boot, forwards only.
- `v1.0.0` when the ten tables stop changing and the PWA ships.
- Never reuse a tag. If a release is broken, tag `v0.1.1` — an existing image digest is
  what people may already be running.

## Before you tag

```bash
make lint   # four groups, all must be clean
make test   # unit + BDD
docker build -t spenicle:local .
docker run --rm -p 8080:8080 -v "$PWD/data:/data" spenicle:local
curl -s localhost:8080/healthz
```
