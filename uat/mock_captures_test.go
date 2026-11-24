package uat_test

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/snaptojson"
	"github.com/dimasbaguspm/spenicle/internal/repository/filestore"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

func newCaptures(t *testing.T, endpoint string) *captures.Service {
	t.Helper()

	ctx := t.Context()

	dir := t.TempDir()

	store, err := sqlite.New(ctx, sqlite.Config{Path: filepath.Join(dir, "uat.db")})
	if err != nil {
		t.Fatalf("open: %v", err)
	}

	t.Cleanup(func() { _ = store.Close(context.WithoutCancel(ctx)) })

	if migrateErr := sqlite.Migrate(ctx, store.DB()); migrateErr != nil {
		t.Fatalf("migrate: %v", migrateErr)
	}

	sealer, err := seal.New("0123456789abcdef")
	if err != nil {
		t.Fatalf("sealer: %v", err)
	}

	extractor, err := snaptojson.New(endpoint, mockKey, 10*time.Second)
	if err != nil {
		t.Fatalf("extractor: %v", err)
	}

	clockSystem := clock.System{}
	ledgerService := ledger.New(store, store, store, fixedCurrency{code: "IDR"}, clockSystem, clockSystem)

	artifacts, err := filestore.New(filepath.Join(dir, "artifacts"), []byte("0123456789abcdef"))
	if err != nil {
		t.Fatalf("filestore: %v", err)
	}

	return captures.New(store, ledgerService, sealer, artifacts, store, extractor, store, clockSystem, clockSystem)
}

type fixedCurrency struct{ code string }

func (f fixedCurrency) BaseCurrency(context.Context) (string, error) { return f.code, nil }

func TestMockVendorSubmitAndReadBack(t *testing.T) {
	service := newCaptures(t, requireMock(t)+mockSnaps)

	ctx := t.Context()

	capture, created, err := service.Create(ctx, captures.CreateInput{
		Kind: constant.CaptureKindImage,
		Artifact: &extraction.Artifact{
			Filename:    "receipt.jpg",
			ContentType: "image/jpeg",
			Bytes:       []byte("not really a jpeg"),
		},
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	if !created {
		t.Fatal("first submit must be a create")
	}

	if capture.Status != constant.CaptureStatusExtracting {
		t.Fatalf("status = %q, want extracting while the vendor runs", capture.Status)
	}

	if capture.JobRef == "" {
		t.Fatal("a 202 must store the vendor's job_ref")
	}

	resolved, err := service.Retry(ctx, capture.Ref)
	if err != nil {
		t.Fatalf("retry: %v", err)
	}

	if resolved.Status != constant.CaptureStatusPending {
		t.Fatalf("status = %q, want pending once the snap is COMPLETED", resolved.Status)
	}

	if !strings.Contains(resolved.DraftJSON, "KOPI KENANGAN") {
		t.Fatalf("draft = %q, want the vendor's fields unsealed", resolved.DraftJSON)
	}

	if resolved.JobRef != capture.JobRef {
		t.Fatalf("job_ref changed: %q -> %q", capture.JobRef, resolved.JobRef)
	}
}

func TestMockVendorRefusesAReadBackWithoutAJobRef(t *testing.T) {
	service := newCaptures(t, requireMock(t)+mockSnaps)

	ctx := t.Context()

	capture, _, err := service.Create(ctx, captures.CreateInput{
		Kind: constant.CaptureKindManual,
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	if capture.JobRef != "" {
		t.Fatalf("a capture with nothing to read must not get a job_ref, got %q", capture.JobRef)
	}

	if _, err := service.Retry(ctx, capture.Ref); !errors.Is(err, entity.ErrInvalidState) {
		t.Fatalf("err = %v, want invalid state", err)
	}
}
