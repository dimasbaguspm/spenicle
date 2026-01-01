# Copilot / Coding Agent Instructions (short)

Follow this minimal checklist before making changes:

- **Read standards:** Check `docs/code_standards.md` for architecture and style.
- **Account context:** If work touches `account`, include `docs/account_service.md` as required context.
- **Plan:** For multi-step tasks, create a `manage_todo_list` entry.
- **Edit:** Use `apply_patch` for modifications; use `create_file` only for new files.
- **Tests:** Run `go test ./...` and ensure all tests pass before finishing.
- **Add tests:** Any behavior change must include tests (unit and/or endpoint).
- **Schemas:** Do NOT add custom JSON marshal/unmarshal methods to schema structs.
- **Errors:** Use Huma helpers (e.g., `huma.Error400BadRequest`) for consistent responses.
- **DB:** Repositories should use the small `DB` interface (QueryRow/Query/Exec) for testability.
- **Keep changes small:** Prefer focused diffs; propose options if unclear.

Quick commands:

```
go test ./... -v              # run all tests with verbose output
gofmt -w .                    # format code
go build . && ./spenicle-api  # build and run app
```

If unsure, present 2 options to the user and request confirmation for larger changes.
