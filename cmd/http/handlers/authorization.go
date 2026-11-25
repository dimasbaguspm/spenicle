package handlers

import (
	"context"
	"net/http"

	"github.com/dimasbaguspm/spenicle/internal/common/access"
	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
)

func requireScopes(ctx context.Context, w http.ResponseWriter, scopes ...string) bool {
	for _, scope := range scopes {
		if access.Current(ctx).Has(scope) {
			continue
		}

		httpx.WriteError(w, http.StatusForbidden, "forbidden", "this action needs the "+scope+" scope")

		return false
	}

	return true
}
