package repositories

import (
	"context"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/jackc/pgx/v5"
	"github.com/pashagolub/pgxmock/v4"
)

// Helper function to create string pointers for test data
func strPtr(s string) *string {
	return &s
}

func TestTransactionRepositoryList(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatal(err)
	}
	defer mock.Close()

	repo := NewTransactionRepository(mock)
	ctx := context.Background()

	t.Run("successfully lists transactions with pagination", func(t *testing.T) {
		params := schemas.SearchParamTransactionSchema{
			PageNumber: 1,
			PageSize:   10,
			SortBy:     "date",
			SortOrder:  "desc",
		}

		mock.ExpectQuery("SELECT COUNT").
			WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(2))

		rows := pgxmock.NewRows([]string{
			"id", "type", "date", "amount", "note", "created_at", "updated_at", "deleted_at",
			"account_id", "account_name", "account_type", "account_amount", "account_icon", "account_icon_color",
			"category_id", "category_name", "category_type", "category_icon", "category_icon_color",
			"dest_account_id", "dest_account_name", "dest_account_type", "dest_account_amount", "dest_account_icon", "dest_account_icon_color",
			"tags",
		}).
			AddRow(1, "expense", time.Now(), 50000, nil, time.Now(), time.Now(), nil,
				1, "Cash", "expense", 100000, strPtr("wallet"), strPtr("#FF0000"),
				1, "Food", "expense", strPtr("food"), strPtr("#00FF00"),
				nil, nil, nil, nil, nil, nil,
				[]byte("[]")).
			AddRow(2, "income", time.Now(), 100000, nil, time.Now(), time.Now(), nil,
				2, "Bank", "income", 500000, strPtr("bank"), strPtr("#0000FF"),
				2, "Salary", "income", strPtr("salary"), strPtr("#FFFF00"),
				nil, nil, nil, nil, nil, nil,
				[]byte("[]"))

		mock.ExpectQuery("SELECT.*FROM transactions t.*JOIN accounts a.*JOIN categories c").
			WithArgs(10, 0).
			WillReturnRows(rows)

		result, err := repo.List(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Items) != 2 {
			t.Errorf("expected 2 transactions, got %d", len(result.Items))
		}

		if result.TotalCount != 2 {
			t.Errorf("expected TotalCount to be 2, got %d", result.TotalCount)
		}
	})

	t.Run("successfully lists transactions with type filter", func(t *testing.T) {
		params := schemas.SearchParamTransactionSchema{
			Type:       []string{"expense"},
			PageNumber: 1,
			PageSize:   10,
			SortBy:     "date",
			SortOrder:  "desc",
		}

		mock.ExpectQuery("SELECT COUNT").
			WithArgs("expense").
			WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(1))

		rows := pgxmock.NewRows([]string{
			"id", "type", "date", "amount", "note", "created_at", "updated_at", "deleted_at",
			"account_id", "account_name", "account_type", "account_amount", "account_icon", "account_icon_color",
			"category_id", "category_name", "category_type", "category_icon", "category_icon_color",
			"dest_account_id", "dest_account_name", "dest_account_type", "dest_account_amount", "dest_account_icon", "dest_account_icon_color",
			"tags",
		}).
			AddRow(1, "expense", time.Now(), 50000, nil, time.Now(), time.Now(), nil,
				1, "Cash", "expense", 100000, strPtr("wallet"), strPtr("#FF0000"),
				1, "Food", "expense", strPtr("food"), strPtr("#00FF00"),
				nil, nil, nil, nil, nil, nil,
				[]byte("[]"))

		mock.ExpectQuery("SELECT.*FROM transactions t.*JOIN accounts a.*JOIN categories c").
			WithArgs("expense", 10, 0).
			WillReturnRows(rows)

		result, err := repo.List(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Items) != 1 {
			t.Errorf("expected 1 transaction, got %d", len(result.Items))
		}

		if result.Items[0].Type != "expense" {
			t.Errorf("expected type 'expense', got %s", result.Items[0].Type)
		}
	})

	t.Run("successfully lists transactions with account and category filters", func(t *testing.T) {
		params := schemas.SearchParamTransactionSchema{
			AccountIDs:  []int{1},
			CategoryIDs: []int{1},
			PageNumber:  1,
			PageSize:    10,
			SortBy:      "createdAt",
			SortOrder:   "desc",
		}

		mock.ExpectQuery("SELECT COUNT").
			WithArgs(1, 1).
			WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(1))

		rows := pgxmock.NewRows([]string{
			"id", "type", "date", "amount", "note", "created_at", "updated_at", "deleted_at",
			"account_id", "account_name", "account_type", "account_amount", "account_icon", "account_icon_color",
			"category_id", "category_name", "category_type", "category_icon", "category_icon_color",
			"dest_account_id", "dest_account_name", "dest_account_type", "dest_account_amount", "dest_account_icon", "dest_account_icon_color",
			"tags",
		}).
			AddRow(1, "expense", time.Now(), 50000, nil, time.Now(), time.Now(), nil,
				1, "Cash", "expense", 100000, strPtr("wallet"), strPtr("#FF0000"),
				1, "Food", "expense", strPtr("food"), strPtr("#00FF00"),
				nil, nil, nil, nil, nil, nil,
				[]byte("[]"))

		mock.ExpectQuery("SELECT.*FROM transactions t.*JOIN accounts a.*JOIN categories c").
			WithArgs(1, 1, 10, 0).
			WillReturnRows(rows)

		result, err := repo.List(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Items) != 1 {
			t.Errorf("expected 1 transaction, got %d", len(result.Items))
		}

		if result.Items[0].AccountID != 1 {
			t.Errorf("expected AccountID 1, got %d", result.Items[0].AccountID)
		}

		if result.Items[0].CategoryID != 1 {
			t.Errorf("expected CategoryID 1, got %d", result.Items[0].CategoryID)
		}
	})

	t.Run("successfully lists transactions with tag filter", func(t *testing.T) {
		params := schemas.SearchParamTransactionSchema{
			TagIDs:     []int{1, 2},
			PageNumber: 1,
			PageSize:   10,
			SortBy:     "date",
			SortOrder:  "desc",
		}

		mock.ExpectQuery("SELECT COUNT").
			WithArgs(1, 2).
			WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(1))

		rows := pgxmock.NewRows([]string{
			"id", "type", "date", "amount", "note", "created_at", "updated_at", "deleted_at",
			"account_id", "account_name", "account_type", "account_amount", "account_icon", "account_icon_color",
			"category_id", "category_name", "category_type", "category_icon", "category_icon_color",
			"dest_account_id", "dest_account_name", "dest_account_type", "dest_account_amount", "dest_account_icon", "dest_account_icon_color",
			"tags",
		}).
			AddRow(1, "expense", time.Now(), 50000, nil, time.Now(), time.Now(), nil,
				1, "Cash", "expense", 100000, strPtr("wallet"), strPtr("#FF0000"),
				1, "Food", "expense", strPtr("food"), strPtr("#00FF00"),
				nil, nil, nil, nil, nil, nil,
				[]byte("[{\"id\":1,\"name\":\"vacation\"}]"))

		mock.ExpectQuery("SELECT.*FROM transactions t.*JOIN accounts a.*JOIN categories c").
			WithArgs(1, 2, 10, 0).
			WillReturnRows(rows)

		result, err := repo.List(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Items) != 1 {
			t.Errorf("expected 1 transaction, got %d", len(result.Items))
		}

		if len(result.Items[0].Tags) != 1 {
			t.Errorf("expected 1 tag, got %d", len(result.Items[0].Tags))
		}

		if result.Items[0].Tags[0].ID != 1 || result.Items[0].Tags[0].Name != "vacation" {
			t.Errorf("expected tag {ID: 1, Name: 'vacation'}, got %+v", result.Items[0].Tags[0])
		}
	})
}

func TestTransactionRepositoryGet(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatal(err)
	}
	defer mock.Close()

	repo := NewTransactionRepository(mock)
	ctx := context.Background()

	t.Run("successfully gets transaction by id", func(t *testing.T) {
		now := time.Now()
		rows := pgxmock.NewRows([]string{
			"id", "type", "date", "amount", "note", "created_at", "updated_at", "deleted_at",
			"account_id", "account_name", "account_type", "account_amount", "account_icon", "account_icon_color",
			"category_id", "category_name", "category_type", "category_icon", "category_icon_color",
			"dest_account_id", "dest_account_name", "dest_account_type", "dest_account_amount", "dest_account_icon", "dest_account_icon_color",
			"tags",
		}).
			AddRow(1, "expense", now, 50000, nil, now, now, nil,
				1, "Cash", "expense", 100000, strPtr("wallet"), strPtr("#FF0000"),
				1, "Food", "expense", strPtr("food"), strPtr("#00FF00"),
				nil, nil, nil, nil, nil, nil,
				[]byte("[{\"id\":1,\"name\":\"vacation\"},{\"id\":2,\"name\":\"travel\"}]"))

		mock.ExpectQuery("SELECT.*FROM transactions t.*JOIN accounts a.*JOIN categories c").
			WithArgs(1).
			WillReturnRows(rows)

		transaction, err := repo.Get(ctx, 1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if transaction.ID != 1 {
			t.Errorf("expected ID 1, got %d", transaction.ID)
		}

		if transaction.Type != "expense" {
			t.Errorf("expected type 'expense', got %s", transaction.Type)
		}

		if transaction.Amount != 50000 {
			t.Errorf("expected amount 50000, got %d", transaction.Amount)
		}

		if len(transaction.Tags) != 2 {
			t.Errorf("expected 2 tags, got %d", len(transaction.Tags))
		}

		if len(transaction.Tags) > 0 {
			if transaction.Tags[0].ID != 1 || transaction.Tags[0].Name != "vacation" {
				t.Errorf("expected first tag to be {ID: 1, Name: 'vacation'}, got %+v", transaction.Tags[0])
			}
			if len(transaction.Tags) > 1 && (transaction.Tags[1].ID != 2 || transaction.Tags[1].Name != "travel") {
				t.Errorf("expected second tag to be {ID: 2, Name: 'travel'}, got %+v", transaction.Tags[1])
			}
		}
	})

	t.Run("returns error when transaction not found", func(t *testing.T) {
		mock.ExpectQuery("SELECT id, type, date, amount, account_id, category_id").
			WithArgs(999).
			WillReturnError(pgx.ErrNoRows)

		_, err := repo.Get(ctx, 999)
		if err == nil {
			t.Error("expected error, got nil")
		}
	})
}

func TestTransactionRepositoryCreate(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatal(err)
	}
	defer mock.Close()

	repo := NewTransactionRepository(mock)
	ctx := context.Background()

	t.Run("successfully creates transaction", func(t *testing.T) {
		now := time.Now()
		input := schemas.CreateTransactionSchema{
			Type:       "expense",
			Date:       &now,
			Amount:     50000,
			AccountID:  1,
			CategoryID: 1,
			Note:       nil,
		}

		rows := pgxmock.NewRows([]string{"id", "type", "date", "amount", "account_id", "category_id", "destination_account_id", "note", "created_at", "updated_at", "deleted_at"}).
			AddRow(1, "expense", now, 50000, 1, 1, nil, nil, now, now, nil)

		mock.ExpectQuery("INSERT INTO transactions").
			WithArgs("expense", &now, 50000, 1, 1, pgxmock.AnyArg(), pgxmock.AnyArg()).
			WillReturnRows(rows)

		transaction, err := repo.Create(ctx, input)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if transaction.ID != 1 {
			t.Errorf("expected ID 1, got %d", transaction.ID)
		}

		if transaction.Type != "expense" {
			t.Errorf("expected type 'expense', got %s", transaction.Type)
		}
	})

	t.Run("successfully creates transaction with default date", func(t *testing.T) {
		now := time.Now()
		input := schemas.CreateTransactionSchema{
			Type:       "income",
			Date:       nil,
			Amount:     75000,
			AccountID:  2,
			CategoryID: 2,
			Note:       nil,
		}

		rows := pgxmock.NewRows([]string{"id", "type", "date", "amount", "account_id", "category_id", "destination_account_id", "note", "created_at", "updated_at", "deleted_at"}).
			AddRow(2, "income", now, 75000, 2, 2, nil, nil, now, now, nil)

		mock.ExpectQuery("INSERT INTO transactions").
			WithArgs("income", pgxmock.AnyArg(), 75000, 2, 2, pgxmock.AnyArg(), pgxmock.AnyArg()).
			WillReturnRows(rows)

		transaction, err := repo.Create(ctx, input)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if transaction.ID != 2 {
			t.Errorf("expected ID 2, got %d", transaction.ID)
		}
	})
}

func TestTransactionRepositoryUpdate(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatal(err)
	}
	defer mock.Close()

	repo := NewTransactionRepository(mock)
	ctx := context.Background()

	t.Run("successfully updates transaction", func(t *testing.T) {
		now := time.Now()
		amount := 75000
		input := schemas.UpdateTransactionSchema{
			Amount: &amount,
		}

		rows := pgxmock.NewRows([]string{"id", "type", "date", "amount", "account_id", "category_id", "destination_account_id", "note", "created_at", "updated_at", "deleted_at"}).
			AddRow(1, "expense", now, 75000, 1, 1, nil, nil, now, now, nil)

		mock.ExpectQuery("UPDATE transactions").
			WithArgs(pgxmock.AnyArg(), pgxmock.AnyArg(), &amount, pgxmock.AnyArg(), pgxmock.AnyArg(), pgxmock.AnyArg(), pgxmock.AnyArg(), 1).
			WillReturnRows(rows)

		transaction, err := repo.Update(ctx, 1, input)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if transaction.Amount != 75000 {
			t.Errorf("expected amount 75000, got %d", transaction.Amount)
		}
	})

	t.Run("returns error when transaction not found", func(t *testing.T) {
		amount := 75000
		input := schemas.UpdateTransactionSchema{
			Amount: &amount,
		}

		mock.ExpectQuery("UPDATE transactions").
			WithArgs(pgxmock.AnyArg(), pgxmock.AnyArg(), &amount, pgxmock.AnyArg(), pgxmock.AnyArg(), pgxmock.AnyArg(), pgxmock.AnyArg(), 999).
			WillReturnError(pgx.ErrNoRows)

		_, err := repo.Update(ctx, 999, input)
		if err == nil {
			t.Error("expected error, got nil")
		}
	})
}

func TestTransactionRepositoryDelete(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatal(err)
	}
	defer mock.Close()

	repo := NewTransactionRepository(mock)
	ctx := context.Background()

	t.Run("successfully deletes transaction", func(t *testing.T) {
		mock.ExpectExec("UPDATE transactions").
			WithArgs(1).
			WillReturnResult(pgxmock.NewResult("UPDATE", 1))

		err := repo.Delete(ctx, 1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("returns error when transaction not found", func(t *testing.T) {
		mock.ExpectExec("UPDATE transactions").
			WithArgs(999).
			WillReturnResult(pgxmock.NewResult("UPDATE", 0))

		err := repo.Delete(ctx, 999)
		if err != ErrTransactionNotFound {
			t.Errorf("expected ErrTransactionNotFound, got %v", err)
		}
	})
}

func TestTransactionRepositoryUpdateAccountBalance(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatal(err)
	}
	defer mock.Close()

	repo := NewTransactionRepository(mock)
	ctx := context.Background()

	t.Run("successfully updates account balance", func(t *testing.T) {
		mock.ExpectExec("UPDATE accounts").
			WithArgs(50000, 1).
			WillReturnResult(pgxmock.NewResult("UPDATE", 1))

		err := repo.UpdateAccountBalance(ctx, 1, 50000)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("successfully updates account balance with negative amount", func(t *testing.T) {
		mock.ExpectExec("UPDATE accounts").
			WithArgs(-30000, 2).
			WillReturnResult(pgxmock.NewResult("UPDATE", 1))

		err := repo.UpdateAccountBalance(ctx, 2, -30000)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("returns error when account not found", func(t *testing.T) {
		mock.ExpectExec("UPDATE accounts").
			WithArgs(50000, 999).
			WillReturnResult(pgxmock.NewResult("UPDATE", 0))

		err := repo.UpdateAccountBalance(ctx, 999, 50000)
		if err == nil {
			t.Error("expected error, got nil")
		}
	})
}
