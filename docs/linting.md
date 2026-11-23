# Linting

Four groups, four configs, four reasons to care. One `golangci-lint` binary.

```bash
make lint               # all four
make lint-correctness   # does the code do what it says?
make lint-style         # is it readable by the next person?
make lint-security      # what can be abused if it is wrong?
make lint-performance   # will it hold up at 10x the data?
make lint-fix           # safe auto-fixes, then re-check
```

Each group is a separate `golangci-lint run -c tools/lint/<group>.yml ./...`, so a
failure tells you which conversation you are having. There is deliberately no root
`.golangci.yml`: one config for all of it would either be the union (a fifth thing to
maintain) or the intersection (too weak to catch anything).

## correctness.yml — blocks a merge

If this fails, something is wrong, not ugly.

`errcheck` `errorlint` `errchkjson` `errname` `nilerr` `nilnesserr` `nilnil`
`wrapcheck` `govet` (all analyzers) `staticcheck` `ineffassign` `unused`
`wastedassign` `copyloopvar` `durationcheck` `makezero` `reassign`
`forcetypeassert` `asasalint` `dogsled` `predeclared` `unconvert`
`usestdlibvars` `mirror` `containedctx` `contextcheck` `fatcontext` `noctx`
`bodyclose` `rowserrcheck` `sqlclosecheck` `unqueryvet` `spancheck` `sloglint`
`loggercheck` `exhaustive` `musttag` `recvcheck` `gocheckcompilerdirectives`
`goprintffuncname` `thelper` `usetesting` `testableexamples`

Tuned here: `govet` runs every analyzer except `fieldalignment` (a size check, not a
bug); `errcheck` flags unchecked type assertions but not deliberate `_ =` ignores;
`sloglint` requires context-aware logging and attribute keys.

## style.yml — asks for a change

Opinions, enforced consistently. Formatters are checked here too, so `make lint-style`
covers `gofumpt`, `goimports`, `gci` and alignment without a second command.

`revive` `gocritic` (style + diagnostic + opinionated) `godoclint` `godot`
`interfacebloat` `inamedparam` `iface` `ireturn` `varnamelen` `tagliatelle` `tagalign`
`canonicalheader` `whitespace` `wsl_v5` `nlreturn` `godox` `misspell` `lll` (110)
`nolintlint` `decorder` `funcorder` `grouper` `embeddedstructfieldcheck` `iotamixing`
`nonamedreturns` `nakedret` `funlen` (70/50) `cyclop` (12) `gocognit` (20) `maintidx`
`nestif` `dupl` `goconst` `mnd` `paralleltest` `tparallel` `testpackage`

`gocritic`'s `unnamedResult` check is disabled: `nonamedreturns` already forbids named
results, and enabling both is a contradiction.

## security.yml — blocks a merge

`gosec` (all rules except G104, which `errcheck` reports better) `bidichk` `forbidigo`
`gomoddirectives` `nosprintfhostport` `asciicheck` `gochecknoinits` `importas`

`forbidigo` bans `fmt.Print*`, `log.Print*`, bare `os.Getenv` outside `internal/common/config`,
`http.Get` and `http.DefaultClient` (no timeouts), and direct `os.Create`/`os.WriteFile`
so file permissions always go through the adapter. Each ban has a message explaining
what to use instead.

## performance.yml — informs, rarely blocks

`prealloc` `perfsprint` `unparam` `unconvert` `mirror` `intrange` `usestdlibvars`
`wastedassign` `copyloopvar` `makezero` `exhaustive` `gocritic` (performance tag only)
`dupl`

This is a single-user SQLite app. The bar is "no obvious waste", not micro-optimisation,
so this group never justifies hurting readability.

## Exclusions policy

Every exclusion in the four configs is a sentence with a reason, not a mute button.
The two patterns that exist:

1. **`_test.go`** loosens `errcheck`, `wrapcheck`, `funlen`, `dupl`, `goconst`, `gosec`,
   and the opinion linters. Tests assert; they do not defend.
2. **Named paths** — `internal/common/config` may read the environment, `cmd/` may log to
   stdout and return interfaces (`main` is the composition root), `uat` may
   ignore `contextcheck` because godog dictates its callback signatures.

## Adding a linter

1. Put it in exactly one group. If you hesitate, it is style.
2. Run `make lint-<group>`. Fix the code, not the config.
3. If a rule must be disabled, disable the narrowest thing and write the reason next to
   it. `nolintlint` enforces an explanation on every `//nolint`.

## Warning about `--fix`

`make lint-fix` only applies fixes from configs whose fixers are safe here. Two linters
were removed for damaging code when auto-fixed:

- **`dupword`** deleted a repeated `NULL` inside a SQL `VALUES` list, silently changing
  a seven-column insert into six. Caught by tests, not by the linter.
- **`golines`** rewrote multi-line raw SQL strings into escaped one-liners, which is
  technically valid and permanently unreadable.

Both are still fine as manual checks. They are just not safe as auto-fixers on a
codebase full of SQL.
