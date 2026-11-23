package handlers

import (
	"errors"
	"log/slog"
	"path/filepath"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/logging"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/exports"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/filestore"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

const testSecret = "0123456789abcdef"

type frozenClock struct{ at time.Time }

func (c frozenClock) Now() time.Time { return c.at }

type exportFixture struct {
	store    *sqlite.Store
	blobs    *filestore.Store
	service  *exports.Service
	job      entity.Export
	document filestore.Record
	now      time.Time
}

func readyExport(t *testing.T, format, contentType string) exportFixture {
	t.Helper()

	ctx := t.Context()

	store, err := sqlite.New(ctx, sqlite.Config{Path: filepath.Join(t.TempDir(), "exports.db")})
	if err != nil {
		t.Fatalf("open: %v", err)
	}

	t.Cleanup(func() { _ = store.Close(ctx) })

	if migrateErr := sqlite.Migrate(ctx, store.DB()); migrateErr != nil {
		t.Fatalf("migrate: %v", migrateErr)
	}

	blobs, err := filestore.New(filepath.Join(t.TempDir(), "exports"), []byte(testSecret))
	if err != nil {
		t.Fatalf("filestore: %v", err)
	}

	now := time.Now().UTC().Truncate(time.Second)
	service := exports.New(store, store, store, blobs, time.Hour, frozenClock{at: now})

	job, created, err := service.Create(ctx, exports.CreateInput{ClientID: "export-1", Format: format})
	if err != nil || !created {
		t.Fatalf("create: created=%v err=%v", created, err)
	}

	if _, claimErr := service.Claim(ctx, 1); claimErr != nil {
		t.Fatalf("claim: %v", claimErr)
	}

	document, err := blobs.Put(ctx, extraction.Artifact{
		Filename:    "spenicle.export",
		ContentType: contentType,
		Bytes:       []byte("rendered document"),
	})
	if err != nil {
		t.Fatalf("store blob: %v", err)
	}

	if _, err := service.Complete(ctx, job.Ref, document.SHA256, document.PlainBytes, nil); err != nil {
		t.Fatalf("complete: %v", err)
	}

	return exportFixture{
		store: store, blobs: blobs, service: service,
		job: job, document: document, now: now,
	}
}

func (f exportFixture) age(t *testing.T) {
	t.Helper()

	if _, err := f.store.DB().ExecContext(t.Context(),
		`UPDATE exports SET expires_at = ?`,
		f.now.Add(-time.Hour).Format(constant.TimestampLayout)); err != nil {
		t.Fatalf("age the job: %v", err)
	}
}

func TestExpiredExportLosesItsBlobAndKeepsItsRow(t *testing.T) {
	cases := []struct {
		name        string
		format      string
		contentType string
	}{
		{name: "a json document", format: constant.ExportFormatJSON, contentType: "application/json"},
		{name: "a csv archive", format: constant.ExportFormatCSV, contentType: "application/zip"},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			ctx := t.Context()
			fixture := readyExport(t, testCase.format, testCase.contentType)

			fixture.age(t)

			runner := &Runner{
				jobs:        fixture.service,
				exportFiles: fixture.blobs,
				logger:      logging.From(slog.New(slog.DiscardHandler), telemetry.ComponentWorker),
			}

			runner.runExports(ctx, fixture.now)

			stored, found, err := fixture.store.ExportByRef(ctx, fixture.job.Ref)
			if err != nil || !found {
				t.Fatalf("the row must survive the sweep: found=%v err=%v", found, err)
			}

			if stored.Status != constant.ExportStatusExpired {
				t.Fatalf("status = %q, want %q", stored.Status, constant.ExportStatusExpired)
			}

			body, openErr := fixture.blobs.Open(ctx, fixture.document.SHA256)
			if openErr == nil {
				_ = body.Close()

				t.Fatalf("export blob %s is still on disk", fixture.document.SHA256)
			}

			if !errors.Is(openErr, filestore.ErrNotFound) {
				t.Fatalf("open blob: %v", openErr)
			}

			again, err := fixture.service.Sweep(ctx, fixture.now.Add(-time.Hour))
			if err != nil {
				t.Fatalf("second sweep: %v", err)
			}

			if again.Expired != 0 {
				t.Fatalf("the second sweep expired %d jobs, want 0", again.Expired)
			}
		})
	}
}

func TestExportsUseTheExportStoreNotTheArtifacts(t *testing.T) {
	ctx := t.Context()
	dir := t.TempDir()

	artifacts, err := filestore.New(filepath.Join(dir, "artifacts"), []byte(testSecret))
	if err != nil {
		t.Fatalf("artifact store: %v", err)
	}

	exportFiles, err := filestore.New(filepath.Join(dir, "exports"), []byte(testSecret))
	if err != nil {
		t.Fatalf("export store: %v", err)
	}

	record, err := exportFiles.Put(ctx, extraction.Artifact{
		Filename:    "spenicle.export",
		ContentType: "application/json",
		Bytes:       []byte(`{"data":{}}`),
	})
	if err != nil {
		t.Fatalf("put: %v", err)
	}

	if _, openErr := artifacts.Open(ctx, record.SHA256); !errors.Is(openErr, filestore.ErrNotFound) {
		t.Fatalf("the document must not land in the artifact store, got %v", openErr)
	}

	body, err := exportFiles.Open(ctx, record.SHA256)
	if err != nil {
		t.Fatalf("open from the export store: %v", err)
	}

	_ = body.Close()
}
