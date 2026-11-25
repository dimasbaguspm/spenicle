package access

import "testing"

func TestFromHas(t *testing.T) {
	tests := []struct {
		name  string
		from  From
		scope string
		want  bool
	}{
		{name: "root", from: From{Root: true}, scope: "entries:write", want: true},
		{name: "exact", from: From{Scopes: []string{"entries:write"}}, scope: "entries:write", want: true},
		{name: "admin", from: From{Scopes: []string{"admin"}}, scope: "entries:write", want: true},
		{name: "wildcard", from: From{Scopes: []string{"*"}}, scope: "entries:write", want: true},
		{name: "missing", from: From{Scopes: []string{"captures:write"}}, scope: "entries:write", want: false},
		{name: "different verb", from: From{Scopes: []string{"entries:read"}}, scope: "entries:write", want: false},
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
	want := From{Root: false, Scopes: []string{"entries:read"}}
	if got := Current(With(t.Context(), want)); got.Root != want.Root || len(got.Scopes) != 1 || got.Scopes[0] != "entries:read" {
		t.Fatalf("Current(With(...)) = %+v, want %+v", got, want)
	}
}
