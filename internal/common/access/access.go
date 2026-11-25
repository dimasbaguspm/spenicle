// Package access carries the caller's authorization facts from the HTTP boundary to the handlers.
package access

import (
	"context"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

type contextKey struct{}

type From struct {
	Root   bool
	Scopes []string
}

func With(ctx context.Context, from From) context.Context {
	return context.WithValue(ctx, contextKey{}, from)
}

func Current(ctx context.Context) From {
	from, _ := ctx.Value(contextKey{}).(From)

	return from
}

func (f From) Has(scope string) bool {
	if f.Root {
		return true
	}

	for _, granted := range f.Scopes {
		if granted == constant.ScopeAll || granted == constant.ScopeAdmin || granted == scope {
			return true
		}
	}

	return false
}
