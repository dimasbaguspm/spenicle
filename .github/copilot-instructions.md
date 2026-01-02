gofmt -w . # format code

# Copilot / Coding Agent Instructions (short)

Follow this minimal checklist before making changes:

- **Code standards:** Check `docs/code_standards.md` (condensed quick reference). For examples and detailed patterns, consult schema files under `internal/database/schemas/` and relevant code in `internal/services/` and `internal/repositories/`.
- **Testing standards:** Refer to `docs/testing_standards.md` for testing guidelines.
- **Account context:** If work touches `account`, include `docs/account_service.md` as required context.
- **Plan:** For multi-step tasks, create a `manage_todo_list` entry before edits.
- **Edit:** Use `apply_patch` for modifications; use `create_file` only for new files.
- **Tests:** Run `go test ./... -v` and ensure all tests pass before finishing; include test updates for any behavior change.
- **Add tests:** Any behavior change must include tests (unit and/or endpoint).
- **Schemas:** Do NOT add custom JSON marshal/unmarshal methods to schema structs; prefer plain DTO structs for Huma.
- **Errors:** Use Huma helpers (e.g., `huma.Error400BadRequest`) for consistent responses.
- **DB:** Repositories should use the small `DB` interface (QueryRow/Query/Exec) for testability.
- **Keep changes small:** Prefer focused diffs; propose options if unclear.

Note: docs under `docs/` were condensed to quick references — when in doubt, prefer code and schema files as the source of truth and add examples/tests rather than expanding docs inline.

Quick commands:

```bash
go test ./... -v              # run all tests with verbose output
gofmt -w .                    # format code
go build ./...                # build
```

If unsure, present 2 options to the user and request confirmation for larger changes.
