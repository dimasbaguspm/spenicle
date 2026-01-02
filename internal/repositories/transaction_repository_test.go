package repositories

import (
	"context"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/jackc/pgx/v5"
	"github.com/pashagolub/pgxmock/v4"
)

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
			Page:           1,
			Limit:          10,
			OrderBy:        "date",
			OrderDirection: "desc",
		}

		mock.ExpectQuery("SELECT COUNT").
			WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(2))

		rows := pgxmock.NewRows([]string{"id", "type", "date", "amount", "account_id", "category_id", "destination_account_id", "note", "created_at", "updated_at", "deleted_at"}).
			AddRow(1, "expense", time.Now(), 50000, 1, 1, nil, nil, time.Now(), time.Now(), nil).
			AddRow(2, "income", time.Now(), 100000, 2, 2, nil, nil, time.Now(), time.Now(), nil)

		mock.ExpectQuery("SELECT id, type, date, amount, account_id, category_id").
			WithArgs(10, 0).
			WillReturnRows(rows)

		result, err := repo.List(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Data) != 2 {
			t.Errorf("expected 2 transactions, got %d", len(result.Data))
		}

		if result.TotalItems != 2 {
			t.Errorf("expected TotalItems to be 2, got %d", result.TotalItems)
		}
	})

	t.Run("successfully lists transactions with type filter", func(t *testing.T) {
		params := schemas.SearchParamTransactionSchema{
			Type:           "expense",
			Page:           1,
			Limit:          10,
			OrderBy:        "date",
			OrderDirection: "desc",
		}

		mock.ExpectQuery("SELECT COUNT").
			WithArgs("expense").
			WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(1))

		rows := pgxmock.NewRows([]string{"id", "type", "date", "amount", "account_id", "category_id", "destination_account_id", "note", "created_at", "updated_at", "deleted_at"}).
			AddRow(1, "expense", time.Now(), 50000, 1, 1, nil, nil, time.Now(), time.Now(), nil)

		mock.ExpectQuery("SELECT id, type, date, amount, account_id, category_id").
			WithArgs("expense", 10, 0).
			WillReturnRows(rows)

		result, err := repo.List(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Data) != 1 {
			t.Errorf("expected 1 transaction, got %d", len(result.Data))
		}

		if result.Data[0].Type != "expense" {
			t.Errorf("expected type 'expense', got %s", result.Data[0].Type)
		}
	})

	t.Run("successfully lists transactions with account and category filters", func(t *testing.T) {
		params := schemas.SearchParamTransactionSchema{
			AccountID:      1,
			CategoryID:     1,
			Page:           1,
			Limit:          10,
			OrderBy:        "created_at",
			OrderDirection: "desc",
		}

		mock.ExpectQuery("SELECT COUNT").
			WithArgs(1, 1).
			WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(1))

		rows := pgxmock.NewRows([]string{"id", "type", "date", "amount", "account_id", "category_id", "destination_account_id", "note", "created_at", "updated_at", "deleted_at"}).
			AddRow(1, "expense", time.Now(), 50000, 1, 1, nil, nil, time.Now(), time.Now(), nil)

		mock.ExpectQuery("SELECT id, type, date, amount, account_id, category_id").
			WithArgs(1, 1, 10, 0).
			WillReturnRows(rows)

		result, err := repo.List(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Data) != 1 {
			t.Errorf("expected 1 transaction, got %d", len(result.Data))
		}

		if result.Data[0].AccountID != 1 {
			t.Errorf("expected AccountID 1, got %d", result.Data[0].AccountID)
		}

		if result.Data[0].CategoryID != 1 {
			t.Errorf("expected CategoryID 1, got %d", result.Data[0].CategoryID)
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
		rows := pgxmock.NewRows([]string{"id", "type", "date", "amount", "account_id", "category_id", "destination_account_id", "note", "created_at", "updated_at", "deleted_at"}).
			AddRow(1, "expense", now, 50000, 1, 1, nil, nil, now, now, nil)

		mock.ExpectQuery("SELECT id, type, date, amount, account_id, category_id").
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
