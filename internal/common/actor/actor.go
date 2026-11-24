// Package actor carries who is making the current change, so the audit journal
// can name them without adding a parameter to every repository method.
package actor

import (
	"context"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

type From struct {
	Kind string
	Ref  string
}

type key struct{}

func With(ctx context.Context, from From) context.Context {
	return context.WithValue(ctx, key{}, from)
}

// Of answers the caller of the current context. A context with no actor was not
// set at a boundary, and the journal records it as the system rather than
// inventing a person.
func Of(ctx context.Context) From {
	from, ok := ctx.Value(key{}).(From)
	if !ok {
		return From{Kind: constant.AuditActorSystem}
	}

	return from
}
