package handlers

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"testing"
)

func TestAllPagesCollectsEveryRow(t *testing.T) {
	cases := []struct {
		name        string
		pages       [][]int
		want        []int
		wantCursors []string
	}{
		{
			name:        "an empty collection stays empty",
			pages:       [][]int{{}},
			want:        []int{},
			wantCursors: []string{""},
		},
		{
			name:        "one page needs no second query",
			pages:       [][]int{{1, 2}},
			want:        []int{1, 2},
			wantCursors: []string{""},
		},
		{
			name:        "every cursor page is appended in order",
			pages:       [][]int{{1, 2, 3}, {4, 5, 6}, {7}},
			want:        []int{1, 2, 4, 5, 7},
			wantCursors: []string{"", rowRef(2), rowRef(5)},
		},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			cursors := make([]string, 0, len(testCase.pages))
			page := 0

			got, err := allPages(t.Context(), 2,
				rowRef,
				func(_ context.Context, cursor string, _ int) ([]int, error) {
					cursors = append(cursors, cursor)
					rows := testCase.pages[page]
					page++

					return rows, nil
				})
			if err != nil {
				t.Fatalf("collect pages: %v", err)
			}

			if !reflect.DeepEqual(got, testCase.want) {
				t.Fatalf("rows = %v, want %v", got, testCase.want)
			}

			if !reflect.DeepEqual(cursors, testCase.wantCursors) {
				t.Fatalf("cursors = %v, want %v", cursors, testCase.wantCursors)
			}
		})
	}
}

func TestAllPagesReturnsTheRepositoryError(t *testing.T) {
	wantErr := errors.New("read failed")

	got, err := allPages(t.Context(), 2,
		rowRef,
		func(context.Context, string, int) ([]int, error) { return nil, wantErr })
	if !errors.Is(err, wantErr) {
		t.Fatalf("error = %v, want %v", err, wantErr)
	}

	if got != nil {
		t.Fatalf("rows = %v, want nil", got)
	}
}

func rowRef(value int) string {
	return fmt.Sprintf("%032d", value)
}
