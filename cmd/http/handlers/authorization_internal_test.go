package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/common/access"
	"github.com/dimasbaguspm/spenicle/internal/constant"
)

func TestRequireScopes(t *testing.T) {
	tests := []struct {
		name       string
		from       access.From
		scopes     []string
		want       bool
		wantStatus int
	}{
		{name: "allowed", from: access.From{Scopes: []string{constant.ScopeEntriesWrite}}, scopes: []string{constant.ScopeEntriesWrite}, want: true},
		{name: "all required scopes", from: access.From{Scopes: []string{constant.ScopeEntriesWrite, constant.ScopePayeesWrite}}, scopes: []string{constant.ScopeEntriesWrite, constant.ScopePayeesWrite}, want: true},
		{name: "root", from: access.From{Root: true}, scopes: []string{constant.ScopeEntriesWrite}, want: true},
		{name: "missing", from: access.From{Scopes: []string{constant.ScopeCapturesWrite}}, scopes: []string{constant.ScopeEntriesWrite}, want: false, wantStatus: http.StatusForbidden},
		{name: "one of two missing", from: access.From{Scopes: []string{constant.ScopeEntriesWrite}}, scopes: []string{constant.ScopeEntriesWrite, constant.ScopePayeesWrite}, want: false, wantStatus: http.StatusForbidden},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ctx := access.With(t.Context(), tc.from)
			recorder := httptest.NewRecorder()

			got := requireScopes(ctx, recorder, tc.scopes...)
			if got != tc.want {
				t.Fatalf("requireScopes() = %v, want %v", got, tc.want)
			}
			if tc.wantStatus != 0 && recorder.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tc.wantStatus)
			}
		})
	}
}

func TestActionScopesAreRequired(t *testing.T) {
	const ref = "0123456789abcdef0123456789abcdef"

	tests := []struct {
		name   string
		scopes []string
		method string
		path   string
		body   string
		call   func(*Server, http.ResponseWriter, *http.Request)
	}{
		{
			name:   "capture approve needs entries write",
			scopes: []string{constant.ScopeCapturesWrite},
			method: http.MethodPatch,
			path:   "/api/captures/" + ref,
			body:   `{"action":"approve"}`,
			call:   (*Server).PatchCapture,
		},
		{
			name:   "capture approve with learning needs payees write",
			scopes: []string{constant.ScopeCapturesWrite, constant.ScopeEntriesWrite},
			method: http.MethodPatch,
			path:   "/api/captures/" + ref,
			body:   `{"action":"approve","payee_ref":"` + ref + `"}`,
			call:   (*Server).PatchCapture,
		},
		{
			name:   "capture match needs entries read",
			scopes: []string{constant.ScopeCapturesWrite},
			method: http.MethodPatch,
			path:   "/api/captures/" + ref,
			body:   `{"action":"match","entry_ref":"` + ref + `"}`,
			call:   (*Server).PatchCapture,
		},
		{
			name:   "import commit needs entries write",
			scopes: []string{constant.ScopeImportsWrite},
			method: http.MethodPatch,
			path:   "/api/imports/" + ref,
			body:   `{"action":"commit"}`,
			call:   (*Server).PatchImport,
		},
		{
			name:   "meta needs every embedded collection scope",
			scopes: []string{constant.ScopeSettingsRead, constant.ScopeAccountsRead},
			method: http.MethodGet,
			path:   "/api/meta",
			call:   (*Server).GetMeta,
		},
		{
			name:   "export download needs ledger read",
			scopes: []string{constant.ScopeExportsRead},
			method: http.MethodGet,
			path:   "/api/exports/" + ref + "/download",
			call:   (*Server).DownloadExport,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			request := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
			request.SetPathValue("ref", ref)
			request.Header.Set("Content-Type", "application/json")
			request = request.WithContext(access.With(t.Context(), access.From{Scopes: tc.scopes}))
			recorder := httptest.NewRecorder()

			tc.call(New(Deps{MaxBodyBytes: 4096}), recorder, request)

			if recorder.Code != http.StatusForbidden {
				t.Fatalf("status = %d, want %d; body %s", recorder.Code, http.StatusForbidden, recorder.Body.String())
			}
		})
	}
}
