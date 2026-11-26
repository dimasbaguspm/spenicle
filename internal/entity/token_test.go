package entity_test

import (
	"testing"
	"time"

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

func TestTokenActive(t *testing.T) {
	now := time.Date(2026, 3, 1, 12, 0, 0, 0, time.UTC)
	past := now.Add(-time.Hour)
	future := now.Add(time.Hour)

	tests := []struct {
		name  string
		token entity.Token
		want  bool
	}{
		{name: "active", token: entity.Token{}, want: true},
		{name: "future expiry", token: entity.Token{ExpiresAt: &future}, want: true},
		{name: "past expiry", token: entity.Token{ExpiresAt: &past}, want: false},
		{name: "revoked", token: entity.Token{RevokedAt: &past}, want: false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.token.Active(now); got != tc.want {
				t.Fatalf("Active(%s) = %v, want %v", now, got, tc.want)
			}
		})
	}
}
