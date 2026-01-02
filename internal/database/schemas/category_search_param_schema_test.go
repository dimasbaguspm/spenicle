package schemas

import (
	"net/url"
	"testing"
)

func TestSearchParamCategorySchema_ParseFromQuery(t *testing.T) {
	tests := []struct {
		name   string
		query  url.Values
		expect SearchParamCategorySchema
	}{
		{
			name:  "empty query returns defaults",
			query: url.Values{},
			expect: SearchParamCategorySchema{
				PageNumber: 1,
				PageSize:   10,
			},
		},
		{
			name: "all params set",
			query: url.Values{
				"name":           []string{"Food"},
				"type":           []string{"expense"},
				"orderBy":        []string{"name"},
				"orderDirection": []string{"asc"},
				"pageNumber":     []string{"2"},
				"pageSize":       []string{"20"},
			},
			expect: SearchParamCategorySchema{
				Name:           "Food",
				Type:           "expense",
				OrderBy:        "name",
				OrderDirection: "asc",
				PageNumber:     2,
				PageSize:       20,
			},
		},
		{
			name: "invalid page number defaults to 1",
			query: url.Values{
				"pageNumber": []string{"invalid"},
			},
			expect: SearchParamCategorySchema{
				PageNumber: 1,
				PageSize:   10,
			},
		},
		{
			name: "invalid page size defaults to 10",
			query: url.Values{
				"pageSize": []string{"invalid"},
			},
			expect: SearchParamCategorySchema{
				PageNumber: 1,
				PageSize:   10,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var spcs SearchParamCategorySchema
			got := spcs.ParseFromQuery(tt.query)

			if got.Name != tt.expect.Name {
				t.Errorf("Name = %v, want %v", got.Name, tt.expect.Name)
			}
			if got.Type != tt.expect.Type {
				t.Errorf("Type = %v, want %v", got.Type, tt.expect.Type)
			}
			if got.OrderBy != tt.expect.OrderBy {
				t.Errorf("OrderBy = %v, want %v", got.OrderBy, tt.expect.OrderBy)
			}
			if got.OrderDirection != tt.expect.OrderDirection {
				t.Errorf("OrderDirection = %v, want %v", got.OrderDirection, tt.expect.OrderDirection)
			}
			if got.PageNumber != tt.expect.PageNumber {
				t.Errorf("PageNumber = %v, want %v", got.PageNumber, tt.expect.PageNumber)
			}
			if got.PageSize != tt.expect.PageSize {
				t.Errorf("PageSize = %v, want %v", got.PageSize, tt.expect.PageSize)
			}
		})
	}
}
