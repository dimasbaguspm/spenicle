package access_test

import (
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/common/access"
)

func TestFromHas(t *testing.T) {
	tests := []struct {
		name  string
		from  access.From
		scope string
		want  bool
	}{
		{name: "root", from: access.From{Root: true}, scope: "entries:write", want: true},
		{name: "exact", from: access.From{Scopes: []string{"entries:write"}}, scope: "entries:write", want: true},
		{name: "admin", from: access.From{Scopes: []string{"admin"}}, scope: "entries:write", want: true},
		{name: "wildcard", from: access.From{Scopes: []string{"*"}}, scope: "entries:write", want: true},
		{name: "missing", from: access.From{Scopes: []string{"captures:write"}}, scope: "entries:write", want: false},
		{name: "different verb", from: access.From{Scopes: []string{"entries:read"}}, scope: "entries:write", want: false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.from.Has(tc.scope); got != tc.want {
				t.Fatalf("Has(%q) = %v, want %v", tc.scope, got, tc.want)
			}
		})
	}
}

func TestContextRoundTrip(t *testing.T) {
	want := access.From{Root: false, Scopes: []string{"entries:read"}}
	got := access.Current(access.With(t.Context(), want))
	if got.Root != want.Root || len(got.Scopes) != 1 || got.Scopes[0] != "entries:read" {
		t.Fatalf("Current(With(...)) = %+v, want %+v", got, want)
	}
}
