package schemas

import (
	"testing"
)

func TestUpdateCategorySchema_HasChanges(t *testing.T) {
	tests := []struct {
		name     string
		update   UpdateCategorySchema
		existing CategorySchema
		want     bool
	}{
		{
			name: "no changes",
			update: UpdateCategorySchema{
				Name: stringPtr("Food"),
				Type: stringPtr("expense"),
			},
			existing: CategorySchema{
				Name: "Food",
				Type: "expense",
			},
			want: false,
		},
		{
			name: "name changed",
			update: UpdateCategorySchema{
				Name: stringPtr("Transport"),
			},
			existing: CategorySchema{
				Name: "Food",
			},
			want: true,
		},
		{
			name: "type changed",
			update: UpdateCategorySchema{
				Type: stringPtr("income"),
			},
			existing: CategorySchema{
				Type: "expense",
			},
			want: true,
		},
		{
			name: "note changed",
			update: UpdateCategorySchema{
				Note: stringPtr("New note"),
			},
			existing: CategorySchema{
				Note: "Old note",
			},
			want: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.update.HasChanges(tt.existing)
			if got != tt.want {
				t.Errorf("HasChanges() = %v, want %v", got, tt.want)
			}
		})
	}
}

func stringPtr(s string) *string {
	return &s
}
