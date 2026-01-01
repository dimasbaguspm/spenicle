package schema

import (
	"net/url"
	"testing"
)

func TestSearchParamAccountSchema_ParseFromQuery(t *testing.T) {
	vals := url.Values{}
	vals.Set("name", "cash")
	vals.Set("type", "income")
	vals.Set("orderBy", "name")
	vals.Set("orderDirection", "asc")
	vals.Set("pageNumber", "2")
	vals.Set("pageSize", "20")

	var sp SearchParamAccountSchema
	out := sp.ParseFromQuery(vals)
	if out.Name != "cash" || out.Type != "income" {
		t.Fatalf("unexpected parsed values: %+v", out)
	}
	if out.PageNumber != 2 || out.PageSize != 20 {
		t.Fatalf("unexpected pagination values: %+v", out)
	}
}
