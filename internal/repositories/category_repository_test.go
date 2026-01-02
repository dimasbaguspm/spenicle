package repositories

import (
	"context"
	"regexp"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	pgxmock "github.com/pashagolub/pgxmock/v2"
)

func TestCategoryRepository_List(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgxmock pool: %v", err)
	}
	defer mock.Close()

	// Expect count query with soft delete filter
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL")).WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(1))

	// Expect select rows with soft delete filter and ORDER BY
	cols := []string{"id", "name", "type", "note", "created_at", "updated_at", "deleted_at"}
	now := time.Now().UTC()
	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, name, type, note, created_at, updated_at, deleted_at FROM categories WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2")).WithArgs(10, 0).
		WillReturnRows(pgxmock.NewRows(cols).AddRow(int64(1), "Food", "expense", "", now, nil, nil))

	repo := NewCategoryRepository(mock)
	out, err := repo.List(context.Background(), schemas.SearchParamCategorySchema{PageNumber: 1, PageSize: 10})
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

func TestCategoryRepository_Get(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgxmock pool: %v", err)
	}
	defer mock.Close()

	cols := []string{"id", "name", "type", "note", "created_at", "updated_at", "deleted_at"}
	now := time.Now().UTC()

	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, name, type, note, created_at, updated_at, deleted_at FROM categories WHERE id = $1 AND deleted_at IS NULL")).WithArgs(int64(2)).
		WillReturnRows(pgxmock.NewRows(cols).AddRow(int64(2), "Transport", "expense", "note", now, nil, nil))

	repo := NewCategoryRepository(mock)
	got, err := repo.Get(context.Background(), 2)
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if got.ID != 2 || got.Name != "Transport" {
		t.Fatalf("unexpected category: %+v", got)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestCategoryRepository_Create(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgxmock pool: %v", err)
	}
	defer mock.Close()

	cols := []string{"id", "name", "type", "note", "created_at", "updated_at", "deleted_at"}
	now := time.Now().UTC()

	mock.ExpectQuery(regexp.QuoteMeta("INSERT INTO categories (name, type, note) VALUES ($1, $2, $3) RETURNING id, name, type, note, created_at, updated_at, deleted_at")).WithArgs("Entertainment", "expense", "").
		WillReturnRows(pgxmock.NewRows(cols).AddRow(int64(3), "Entertainment", "expense", "", now, nil, nil))

	repo := NewCategoryRepository(mock)
	created, err := repo.Create(context.Background(), schemas.CreateCategorySchema{Name: "Entertainment", Type: "expense"})
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if created.ID != 3 || created.Name != "Entertainment" {
		t.Fatalf("unexpected created: %+v", created)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestCategoryRepository_Update(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgxmock pool: %v", err)
	}
	defer mock.Close()

	cols := []string{"id", "name", "type", "note", "created_at", "updated_at", "deleted_at"}
	now := time.Now().UTC()

	mock.ExpectQuery(regexp.QuoteMeta("UPDATE categories SET name = COALESCE($2, name), type = COALESCE($3, type), note = COALESCE($4, note), updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING id, name, type, note, created_at, updated_at, deleted_at")).WithArgs(int64(3), pgxmock.AnyArg(), pgxmock.AnyArg(), pgxmock.AnyArg()).
		WillReturnRows(pgxmock.NewRows(cols).AddRow(int64(3), "Entertainment-upd", "expense", "", now, nil, nil))

	repo := NewCategoryRepository(mock)

	name := "Entertainment-upd"

	updated, err := repo.Update(context.Background(), 3, schemas.UpdateCategorySchema{Name: &name})
	if err != nil {
		t.Fatalf("Update failed: %v", err)
	}
	if updated.Name != "Entertainment-upd" {
		t.Fatalf("unexpected updated: %+v", updated)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestCategoryRepository_Delete(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgxmock pool: %v", err)
	}
	defer mock.Close()

	mock.ExpectExec(regexp.QuoteMeta("UPDATE categories SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL")).WithArgs(int64(3)).WillReturnResult(pgxmock.NewResult("UPDATE", 1))

	repo := NewCategoryRepository(mock)
	if err := repo.Delete(context.Background(), 3); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
