# Planned, not implemented

Nothing on the roadmap is unbuilt at the moment. The decisions that closed the list:

- **API tokens are ours, after all — and now exist.** `POST/GET /api/tokens` and
  `DELETE /api/tokens/{ref}` mint, list and revoke a scoped, digest-at-rest credential that
  is strictly less than the root credential (they live in the root-only mux, so a
  token can never mint one). The earlier "use better-auth's plugin" answer died with the
  Go backend: there is no second runtime to host it.
- **`/api/months/{yyyy-mm}` became `/api/analytics/<namespace>`.** One concrete shape per
  question (`months`, `categories`, saved views) beats one polymorphic analytics route.

Open questions kept deliberately out of the API: `custom` namespaces beyond the two
implemented, token expiry, and a per-token rate limit.
