package httpcmd

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

func TestIrreversibleSetupIsRootOnly(t *testing.T) {
	groups := (&server{}).routes()

	if _, ok := groups.scoped.scopes["POST /api/setup"]; ok {
		t.Fatal("setup must not be reachable with a token")
	}

	request := httptest.NewRequest(http.MethodPost, "/api/setup", http.NoBody)
	if _, pattern := groups.root.mux.Handler(request); pattern == "" {
		t.Fatal("setup is not mounted on the root-only mux")
	}
}

func TestCustomQueryWritesNeedWriteScope(t *testing.T) {
	groups := (&server{}).routes()

	tests := []struct {
		pattern string
		scope   string
	}{
		{pattern: "POST /api/analytics/custom", scope: constant.ScopeAnalyticsWrite},
		{pattern: "PATCH /api/analytics/custom/{ref}", scope: constant.ScopeAnalyticsWrite},
		{pattern: "GET /api/analytics/custom/{ref}", scope: constant.ScopeAnalyticsRead},
	}

	for _, tc := range tests {
		got, ok := groups.scoped.scopes[tc.pattern]
		if !ok {
			t.Fatalf("%s is not registered in the scoped mux", tc.pattern)
		}
		if got != tc.scope {
			t.Fatalf("%s needs %q, want %q", tc.pattern, got, tc.scope)
		}
	}
}
