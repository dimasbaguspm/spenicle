---
name: release
description: Cut a Spenicle release (patch, minor or major) by pushing a git tag, then verify the image and the generated notes.
---

# Release

A pushed tag is the only release path: there is no workflow dispatch, no manual
upload, no binary asset. Canonical doc: [`docs/releasing.md`](../../docs/releasing.md).

## 1. Choose the number

| change | bump | example |
| --- | --- | --- |
| fix, lint, docs, no behaviour change | patch | `v0.1.0 → v0.1.1` |
| new endpoint, new config knob, new behaviour, still backward compatible | minor | `v0.1.1 → v0.2.0` |
| env var renamed/removed, schema changed in a way old data needs migration for, anything an operator must do | major (while `0.x`, say it in the notes) | `v0.2.0 → v1.0.0` |

While the version is `0.x`, a schema change is allowed in a minor, but the notes
must say "migrations run on boot, forwards only". Never move or reuse a tag.

## 2. Prove main is green

```bash
git checkout main && git pull
make test            # unit + UAT
make lint            # four groups, 0 issues each
gh run list --limit 1 --branch main   # CI must be success on this commit
```

A red commit tagged `v0.x.y` publishes a red `latest`. Don't.

## 3. Tag and push

```bash
git tag -a v0.1.1 -m "v0.1.1"
git push origin v0.1.1
```

Annotated tag, semver only (`vMAJOR.MINOR.PATCH`). Anything else matching `v*`
fails the workflow before publishing.

## 4. Watch the run

```bash
gh run list --limit 1 --workflow release
gh run watch <run-id>       # buildx builds linux/amd64 + linux/arm64
```

Steps: resolve version → QEMU → buildx → login GHCR → build+push image →
generate notes → `gh release create`.

## 5. Verify the artifact

```bash
gh release view v0.1.1                       # notes: image, digest, commit links
docker pull ghcr.io/dimasbaguspm/spenicle:v0.1.1
docker run --rm -e APP_SECRET=0123456789abcdef \
  -e BASE_CURRENCY=IDR -p 8080:8080 ghcr.io/dimasbaguspm/spenicle:v0.1.1 &
curl -s localhost:8080/healthz               # version must be v0.1.1+<sha7>
docker run --rm --entrypoint /usr/local/bin/spenicle \
  ghcr.io/dimasbaguspm/spenicle:v0.1.1 --help 2>/dev/null || true
```

`healthz.version` is `<tag>+<sha7>` — the tag says what you meant to ship, the sha
says what you shipped.

## Failure modes

| symptom | cause | fix |
| --- | --- | --- |
| run fails at "Resolve version" | tag is not semver | delete the tag, re-tag correctly |
| arm64 build fails `exec format error` | QEMU step missing | do not remove `docker/setup-qemu-action` |
| image pushes but no release | `contents: write` missing | check workflow permissions |
| verified a broken image | shipped it | tag the next patch; never re-push the old tag |

## Done means

- `gh release view` shows the image table and every commit as a link
- `docker pull` of the new tag works anonymously
- `/healthz` reports `vX.Y.Z+<sha7>`
- `main` and the tag agree (`git rev-parse vX.Y.Z^{commit}` == `git rev-parse main`)
