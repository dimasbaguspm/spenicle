# Planned, not implemented

No route on the roadmap is unbuilt. Open gaps live in
[`../product-deck/features/09-gaps-and-next.md`](../product-deck/features/09-gaps-and-next.md):
per-token rate limit, mail attachments/IMAP, import payee learning and cross-process trace
propagation. The decisions that closed the old list:

- **API tokens are ours, after all — and now exist.** `POST/GET /api/tokens` and
  `POST /api/tokens/{ref}/revoke` mint, list and revoke a scoped, digest-at-rest credential
  that is strictly less than the root credential (they live in the root-only mux, so a
  token can never mint one). Optional `expires_at` shipped with them. The earlier "use
  better-auth's plugin" answer died with the Go backend: there is no second runtime to host it.
- **`/api/months/{yyyy-mm}` became `/api/analytics/<namespace>`.** One concrete shape per
  question (`months`, `categories`, saved views) beats one polymorphic analytics route.

Open questions kept deliberately out of the API: `custom` namespaces beyond the two
implemented, un-revoke and a per-token rate limit.
