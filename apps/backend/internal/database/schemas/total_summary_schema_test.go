package schemas

import "testing"

func TestTotalSummaryParamModel(t *testing.T) {
	t.Run("empty params are valid", func(t *testing.T) {
		schema := TotalSummaryParamModel{}
		if schema.StartDate != "" {
			t.Errorf("expected empty StartDate, got %s", schema.StartDate)
		}
		if schema.EndDate != "" {
			t.Errorf("expected empty EndDate, got %s", schema.EndDate)
		}
	})

	t.Run("with date params", func(t *testing.T) {
		schema := TotalSummaryParamModel{
			StartDate: "2024-01-01T00:00:00Z",
			EndDate:   "2024-12-31T23:59:59Z",
		}
		if schema.StartDate != "2024-01-01T00:00:00Z" {
			t.Errorf("expected StartDate to be set, got %s", schema.StartDate)
		}
		if schema.EndDate != "2024-12-31T23:59:59Z" {
			t.Errorf("expected EndDate to be set, got %s", schema.EndDate)
		}
	})
}

func TestTotalSummarySchema(t *testing.T) {
	t.Run("schema fields", func(t *testing.T) {
		schema := TotalSummarySchema{
			Expense:           100,
			Income:            50,
			Transfer:          10,
			TotalTransactions: 160,
		}

		if schema.Expense != 100 {
			t.Errorf("expected Expense to be 100, got %d", schema.Expense)
		}
		if schema.Income != 50 {
			t.Errorf("expected Income to be 50, got %d", schema.Income)
		}
		if schema.Transfer != 10 {
			t.Errorf("expected Transfer to be 10, got %d", schema.Transfer)
		}
		if schema.TotalTransactions != 160 {
			t.Errorf("expected TotalTransactions to be 160, got %d", schema.TotalTransactions)
		}
	})
}
