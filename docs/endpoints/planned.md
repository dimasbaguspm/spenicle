# Planned, not implemented

Nothing on the roadmap is unbuilt at the moment. The two decisions that closed the list:

- **API tokens are not ours to build.** The web client is the only supported client, and
  better-auth ships an API-key plugin (hashed at rest, scoped, revocable) for the first
  machine client. A second credential store here would only be migration cost.
- **`/api/months/{yyyy-mm}` became `/api/analytics/<namespace>`.** One concrete shape per
  question (`months`, `categories`, saved views) beats one polymorphic analytics route.

Open questions kept deliberately out of the API: opening balance on `POST /api/setup`,
parent roll-up in `categories`, and `custom` namespaces beyond the two implemented.
