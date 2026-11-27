package entity_test

import (
	"errors"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func TestCheckParent(t *testing.T) {
	root := entity.Account{ID: 1, Ref: "root", Kind: "expense"}
	child := entity.Account{ID: 2, Ref: "child", Kind: "expense"}
	asset := entity.Account{ID: 3, Ref: "asset", Kind: "asset"}

	tests := []struct {
		name      string
		candidate entity.AccountParent
		wantErr   bool
	}{
		{
			name:      "an account without a parent is accepted",
			candidate: entity.AccountParent{ChildKind: "expense"},
		},
		{
			name:      "a parent of the same kind is accepted",
			candidate: entity.AccountParent{ChildKind: "expense", Ancestors: []entity.Account{root}},
		},
		{
			name:      "a grandparent chain is accepted",
			candidate: entity.AccountParent{ChildKind: "expense", Ancestors: []entity.Account{child, root}},
		},
		{
			name: "a parent of another kind is refused",
			candidate: entity.AccountParent{
				ChildKind: "expense", Ancestors: []entity.Account{asset},
			},
			wantErr: true,
		},
		{
			name: "a node cannot descend from itself",
			candidate: entity.AccountParent{
				ChildRef: child.Ref, ChildKind: "expense", Ancestors: []entity.Account{child, root},
			},
			wantErr: true,
		},
		{
			name: "a fourth level is refused",
			candidate: entity.AccountParent{
				ChildKind: "expense",
				Ancestors: []entity.Account{child, root, root},
			},
			wantErr: true,
		},
		{
			name: "a moved subtree deeper than the limit is refused",
			candidate: entity.AccountParent{
				ChildKind: "expense", Ancestors: []entity.Account{child, root}, Descendants: 1,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := entity.CheckParent(tt.candidate)

			if tt.wantErr {
				if !errors.Is(err, entity.ErrInvalidParent) {
					t.Fatalf("want ErrInvalidParent, got %v", err)
				}

				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}
