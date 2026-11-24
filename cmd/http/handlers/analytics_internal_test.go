package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
)

func TestCategoryAnalyticsRefusesBucketWithRollup(t *testing.T) {
	tests := []struct {
		name  string
		query string
	}{
		{name: "bucket before rollup", query: "bucket=month&rollup=parent"},
		{name: "rollup before bucket", query: "rollup=parent&bucket=month"},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			requireBucketRollupRefused(t, testCase.query)
		})
	}
}

func requireBucketRollupRefused(t *testing.T, query string) {
	t.Helper()

	request := httptest.NewRequest(http.MethodGet, "/api/analytics/categories?"+query, http.NoBody)
	recorder := httptest.NewRecorder()

	New(Deps{}).CategoryAnalytics(recorder, request)

	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusUnprocessableEntity)
	}

	var body httpx.ErrorBody
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode error body: %v", err)
	}

	if body.Error.Code != "invalid_request" {
		t.Fatalf("code = %q, want invalid_request", body.Error.Code)
	}

	for _, param := range []string{"bucket", "rollup"} {
		if !strings.Contains(body.Error.Message, param) {
			t.Fatalf("message %q does not name %q", body.Error.Message, param)
		}
	}
}
