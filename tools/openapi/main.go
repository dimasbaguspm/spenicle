// Package main renders the OpenAPI document the web client is generated from. It
// holds the API-level metadata only: every operation lives next to the handler that
// serves it, so a published path can never drift from the code that answers it.
package main

import (
	"fmt"
	"os"
)

// @title                      Spenicle API
// @version                    2.0.0
// @description                Self-hosted, single-user expense tracker. Capture is separate from organizing: a capture parks something unconfirmed, and only an approval writes a ledger entry.
// @securityDefinitions.apikey Bearer
// @in                         header
// @name                       Authorization
// @description                `Bearer <credential>`: the instance password (root, every route) or a scoped token. A token answers only the routes whose scope it carries; the root-only surface (`/api/tokens*`, `/api/password`, `PATCH /api/settings`) never answers a token.
func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
