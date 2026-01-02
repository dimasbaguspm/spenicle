package schemas

import (
	"encoding/json"
	"testing"
)

func TestSummaryCategoryModel(t *testing.T) {
	t.Run("marshals to JSON correctly", func(t *testing.T) {
		item := SummaryCategoryModel{
			CategoryID:    1,
			CategoryName:  "Food",
			CategoryType:  "expense",
			TotalCount:    75,
			IncomeAmount:  0,
			ExpenseAmount: 1500000,
			Net:           -1500000,
		}
		data, err := json.Marshal(item)
		if err != nil {
			t.Fatalf("failed to marshal: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty JSON")
		}
	})
}

func TestSummaryCategorySchema(t *testing.T) {
	t.Run("marshals to JSON correctly", func(t *testing.T) {
		schema := SummaryCategorySchema{
			Data: []SummaryCategoryModel{
				{
					CategoryID:    1,
					CategoryName:  "Food",
					TotalCount:    50,
					ExpenseAmount: 1000000,
					Net:           -1000000,
				},
			},
		}
		data, err := json.Marshal(schema)
		if err != nil {
			t.Fatalf("failed to marshal: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty JSON")
		}
	})

	t.Run("accepts empty data array", func(t *testing.T) {
		schema := SummaryCategorySchema{
			Data: []SummaryCategoryModel{},
		}
		if len(schema.Data) != 0 {
			t.Error("expected empty data array")
		}
	})
}
