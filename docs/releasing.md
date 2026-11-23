# Releasing

Two workflows. CI runs on every push and pull request; release runs only when a
tag is pushed. There is no button, no dispatch input, no other path: **a git tag is
the release**.

## CI

`.github/workflows/ci.yml` — two jobs, run in parallel:

| job | what |
|---|---|
| `build and test` | `go build ./...` then `go test ./... -count=1` |
| `lint (<group>)` | four parallel runners, one per lint group |

Speed comes from parallelism and caching, not from skipping things: Go module and
build caches are restored by `setup-go`, a second push to the same ref before the
first finishes cancels the first run, and the four lint groups never queue behind
each other. A style failure cannot hide a security failure because they are
separate jobs.

## Release: one command

```bash
git tag -a v0.2.0 -m "v0.2.0"
git push origin v0.2.0
```

That is the whole procedure. The tag must be semver (`vMAJOR.MINOR.PATCH`); any
other tag matching `v*` fails the run before anything is published, so a typo never
becomes a release. Annotated tags are preferred because they carry a message and a
tagger.

## What a release produces

One artifact: **the container image**, and a GitHub release whose notes are links.

1. **Image** — `ghcr.io/<owner>/spenicle`, built for `linux/amd64` and
   `linux/arm64`, tagged four ways:

   | tag | use |
   |---|---|
   | `v0.2.0` | exact release, immutable in practice |
   | `0.2.0` | same digest, for tooling that dislikes the `v` |
   | `sha-<sha7>` | the commit, before or after a tag exists |
   | `latest` | convenience; moves on every release |

2. **GitHub release** — no attached files. The notes carry a table (image,
   digest, platforms, commit, the version `/healthz` reports) and then every commit
   since the previous tag, each one a **clickable link** to its commit, followed by
   a compare link across the whole range:

   ```markdown
   - [`ef11104`](https://github.com/owner/spenicle/commit/ef111044…) feat: trace every method
   **Full diff:** [v0.1.0...v0.2.0](https://github.com/owner/spenicle/compare/v0.1.0...v0.2.0)
   ```

## Why no binary assets

A tarball plus a checksum file is a second distribution channel that has to be
built, named, uploaded and trusted separately from the thing people actually run.
The image already contains the binary, is signed by the same workflow, and is the
only thing this project ever asks a user to deploy. Keeping one artifact means one
place to look, one digest to pin, and no "Linux binary is 0.2.0 but the image is
0.2.1" drift.

If you want a binary outside Docker, build it from the tag:

```bash
git checkout v0.2.0
CGO_ENABLED=0 go build -trimpath \
  -ldflags "-s -w -X main.version=$(git describe --tags --always)+$(git rev-parse --short=7 HEAD)" \
  -o spenicle ./cmd/http
```

Pin a deployment to the digest, not the tag, when reproducibility matters:

```bash
docker pull ghcr.io/<owner>/spenicle@sha256:<digest from the release notes>
```

## The version string carries the commit

The version compiled into the binary is `<tag>+<sha7>`:

```
v0.2.0+ef11104
```

- `-ldflags "-X main.version=..."` in the Dockerfile; the release passes the tag
  and short hash as build args.
- `/healthz` returns it, so a running container can be identified without
  inspecting the image tag: `{"status":"ok","version":"v0.2.0+ef11104", ...}`.

Rationale: a semver tag says what you intended to ship, the short hash says what you
actually shipped. Both matter when a container has been running for three months.

Docker tags cannot contain `+`, which is why the image uses `v0.2.0` and
`sha-<sha7>` separately instead of the combined string.

## Versioning policy

- `v0.x.y` while the ledger schema is still moving. Any release may change the schema;
  migrations run on boot, forwards only.
- `v1.0.0` when the ten tables stop changing and the PWA ships.
- Never reuse or move a tag. If a release is broken, tag `v0.1.1` — an existing image
  digest is what people may already be running.

## Before you tag

```bash
cp .env.example .env   # APP_SECRET is required to boot
make lint    # four groups, all must be clean
make test    # unit + UAT
docker build -t spenicle:local .
docker run --rm -p 8080:8080 -v spenicle-data:/data -e APP_SECRET="local-test-secret-16" spenicle:local
curl -s localhost:8080/healthz
```

Step-by-step with the patch/minor/major decision table:
[`skills/release`](../skills/release/SKILL.md).

CI runs the same build and test commands on `main`; a green run on the commit you
are about to tag is the real precondition. Tagging a red commit publishes a red
image under `latest`, so don't.
