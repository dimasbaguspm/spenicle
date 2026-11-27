package idem_test

import (
	"strings"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/common/actor"
	"github.com/dimasbaguspm/spenicle/internal/common/idem"
	"github.com/dimasbaguspm/spenicle/internal/constant"
)

func TestPrefix(t *testing.T) {
	tokenRef := strings.Repeat("ab", 16)

	tests := []struct {
		name   string
		caller actor.From
		set    bool
		want   string
	}{
		{name: "no actor is root", want: idem.RootPrefix},
		{
			name:   "a token names itself",
			caller: actor.From{Kind: constant.AuditActorUser, Ref: tokenRef},
			set:    true,
			want:   tokenRef,
		},
		{
			name:   "the worker has no prefix of its own",
			caller: actor.From{Kind: constant.AuditActorWorker},
			set:    true,
			want:   idem.RootPrefix,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ctx := t.Context()
			if tc.set {
				ctx = actor.With(ctx, tc.caller)
			}

			if got := idem.Prefix(ctx); got != tc.want {
				t.Fatalf("Prefix() = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestMint(t *testing.T) {
	first, err := idem.Mint(t.Context())
	if err != nil {
		t.Fatalf("Mint() error = %v", err)
	}

	second, err := idem.Mint(t.Context())
	if err != nil {
		t.Fatalf("Mint() error = %v", err)
	}

	if first == second {
		t.Fatalf("Mint() handed out the same key twice: %q", first)
	}

	if !idem.Valid(first) {
		t.Fatalf("Mint() produced %q, which Valid refuses", first)
	}
}

func TestValid(t *testing.T) {
	tokenRef := strings.Repeat("ab", 16)

	tests := []struct {
		name string
		key  string
		want bool
	}{
		{name: "a minted token key", key: tokenRef + "_0123456789abcdef", want: true},
		{name: "a minted root key", key: "root_0123456789abcdef", want: true},
		{name: "an empty key", key: "", want: false},
		{name: "a short random tail", key: "root_0123", want: false},
		{name: "an arbitrary client key", key: "my-laptop-1", want: false},
		{name: "an id-shaped key", key: tokenRef + "_0123456789ABCDEF", want: false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := idem.Valid(tc.key); got != tc.want {
				t.Fatalf("Valid(%q) = %v, want %v", tc.key, got, tc.want)
			}
		})
	}
}

func TestNormalize(t *testing.T) {
	tests := []struct {
		name string
		key  string
		want string
	}{
		{name: "trims", key: "  key-1 ", want: "key-1"},
		{name: "keeps a bare key", key: "key-1", want: "key-1"},
		{name: "empty stays empty", key: "   ", want: ""},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := idem.Normalize(tc.key); got != tc.want {
				t.Fatalf("Normalize(%q) = %q, want %q", tc.key, got, tc.want)
			}
		})
	}
}
