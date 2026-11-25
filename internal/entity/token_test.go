package entity_test

import (
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func TestKnownScope(t *testing.T) {
	tests := []struct {
		scope string
		want  bool
	}{
		{scope: constant.ScopeAnalyticsRead, want: true},
		{scope: constant.ScopeAnalyticsWrite, want: true},
		{scope: constant.ScopeEntriesWrite, want: true},
		{scope: constant.ScopeAdmin, want: true},
		{scope: constant.ScopeAll, want: true},
		{scope: "analytics:admin", want: false},
		{scope: "ledger:read", want: false},
	}

	for _, tc := range tests {
		t.Run(tc.scope, func(t *testing.T) {
			if got := entity.KnownScope(tc.scope); got != tc.want {
				t.Fatalf("KnownScope(%q) = %v, want %v", tc.scope, got, tc.want)
			}
		})
	}
}
