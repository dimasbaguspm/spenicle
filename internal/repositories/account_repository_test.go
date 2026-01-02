package repositories

import (
	"context"
	"regexp"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	pgxmock "github.com/pashagolub/pgxmock/v2"
)

func TestAccountRepository_List(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgxmock pool: %v", err)
	}
	defer mock.Close()

	// Expect count query
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM accounts")).WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(1))

	// Expect select rows
	cols := []string{"id", "name", "type", "note", "amount", "created_at", "updated_at", "deleted_at"}
	now := time.Now().UTC()
	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, name, type, note, amount, created_at, updated_at, deleted_at FROM accounts LIMIT $1 OFFSET $2")).WithArgs(10, 0).
		WillReturnRows(pgxmock.NewRows(cols).AddRow(int64(1), "A", "expense", "", int64(10), now, nil, nil))

	repo := NewAccountRepository(mock)
	out, err := repo.List(context.Background(), schemas.SearchParamAccountSchema{PageNumber: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if out.TotalCount != 1 {
		t.Fatalf("unexpected total count: %d", out.TotalCount)
	}
	if len(out.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(out.Items))
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestAccountRepository_Get(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgxmock pool: %v", err)
	}
	defer mock.Close()

	cols := []string{"id", "name", "type", "note", "amount", "created_at", "updated_at", "deleted_at"}
	now := time.Now().UTC()

	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, name, type, note, amount, created_at, updated_at, deleted_at FROM accounts WHERE id = $1")).WithArgs(int64(2)).
		WillReturnRows(pgxmock.NewRows(cols).AddRow(int64(2), "B", "income", "note", int64(20), now, nil, nil))

	repo := NewAccountRepository(mock)
	got, err := repo.Get(context.Background(), 2)
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if got.ID != 2 || got.Name != "B" {
		t.Fatalf("unexpected account: %+v", got)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestAccountRepository_Create(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgxmock pool: %v", err)
	}
	defer mock.Close()

	cols := []string{"id", "name", "type", "note", "amount", "created_at", "updated_at", "deleted_at"}
	now := time.Now().UTC()

	mock.ExpectQuery(regexp.QuoteMeta("INSERT INTO accounts (name, type, note, amount) VALUES ($1, $2, $3, $4) RETURNING id, name, type, note, amount, created_at, updated_at, deleted_at")).WithArgs("C", "expense", "", int64(30)).
		WillReturnRows(pgxmock.NewRows(cols).AddRow(int64(3), "C", "expense", "", int64(30), now, nil, nil))

	repo := NewAccountRepository(mock)
	created, err := repo.Create(context.Background(), schemas.CreateAccountSchema{Name: "C", Type: "expense", Amount: 30})
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if created.ID != 3 || created.Name != "C" {
		t.Fatalf("unexpected created: %+v", created)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestAccountRepository_Update(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgxmock pool: %v", err)
	}
	defer mock.Close()

	cols := []string{"id", "name", "type", "note", "amount", "created_at", "updated_at", "deleted_at"}
	now := time.Now().UTC()

	mock.ExpectQuery(regexp.QuoteMeta("UPDATE accounts SET name = COALESCE($2, name), type = COALESCE($3, type), note = COALESCE($4, note), amount = COALESCE($5, amount), updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, type, note, amount, created_at, updated_at, deleted_at")).WithArgs(int64(3), pgxmock.AnyArg(), pgxmock.AnyArg(), pgxmock.AnyArg(), pgxmock.AnyArg()).
		WillReturnRows(pgxmock.NewRows(cols).AddRow(int64(3), "C-upd", "expense", "", int64(35), now, nil, nil))

	repo := NewAccountRepository(mock)

	name := "C-upd"
	amount := int64(35)

	updated, err := repo.Update(context.Background(), 3, schemas.UpdateAccountSchema{Name: &name, Amount: &amount})
	if err != nil {
		t.Fatalf("Update failed: %v", err)
	}
	if updated.Name != "C-upd" || updated.Amount != 35 {
		t.Fatalf("unexpected updated: %+v", updated)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestAccountRepository_Delete(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgxmock pool: %v", err)
	}
	defer mock.Close()

	mock.ExpectExec(regexp.QuoteMeta("UPDATE accounts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1")).WithArgs(int64(3)).WillReturnResult(pgxmock.NewResult("UPDATE", 1))

	repo := NewAccountRepository(mock)
	if err := repo.Delete(context.Background(), 3); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
