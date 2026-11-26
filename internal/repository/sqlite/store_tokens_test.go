package sqlite_test

import (
	"database/sql"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func TestTouchTokenOnlyAdvances(t *testing.T) {
	store := newStore(t)
	ctx := t.Context()

	token, err := store.InsertToken(ctx, entity.Token{
		Name:    "reader",
		Preview: "spl_ab12…9f3c",
		Digest:  "digest",
		Scopes:  []string{constant.ScopeEntriesRead},
	})
	if err != nil {
		t.Fatalf("insert token: %v", err)
	}

	base := time.Date(2026, time.February, 1, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name string
		at   time.Time
		want string
	}{
		{name: "the first stamp is written", at: base, want: base.Format(constant.TimestampLayout)},
		{name: "the same second is not rewritten", at: base.Add(500 * time.Millisecond), want: base.Format(constant.TimestampLayout)},
		{name: "a later second advances", at: base.Add(time.Second), want: base.Add(time.Second).Format(constant.TimestampLayout)},
		{name: "an older stamp never overwrites", at: base, want: base.Add(time.Second).Format(constant.TimestampLayout)},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if err := store.TouchToken(ctx, token.Ref, tc.at); err != nil {
				t.Fatalf("touch token: %v", err)
			}

			var got sql.NullString
			if err := store.DB().QueryRowContext(ctx,
				`SELECT last_used_at FROM api_tokens WHERE ref = ?`, token.Ref).Scan(&got); err != nil {
				t.Fatalf("read last_used_at: %v", err)
			}
			if !got.Valid || got.String != tc.want {
				t.Fatalf("last_used_at = %q, want %q", got.String, tc.want)
			}
		})
	}
}
