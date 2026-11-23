// Command erd renders the schema as a Mermaid entity relationship diagram, so the
// document is read from the database instead of maintained by hand.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"github.com/dimasbaguspm/spenicle/internal/module/erd"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

const (
	outputPath = "docs/erd.md"
	dbFileName = "spenicle.db"
	filePerm   = 0o644
)

func main() {
	os.Exit(generate())
}

func generate() int {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))

	if err := run(ctx, logger); err != nil {
		logger.ErrorContext(ctx, "render the entity relationship diagram", slog.Any("error", err))

		return 1
	}

	return 0
}

func run(ctx context.Context, logger *slog.Logger) error {
	dir, err := os.MkdirTemp("", "spenicle-erd")
	if err != nil {
		return fmt.Errorf("create temp dir: %w", err)
	}

	defer func() { _ = os.RemoveAll(dir) }()

	db, err := sqlite.Open(ctx, sqlite.Config{Path: filepath.Join(dir, dbFileName)})
	if err != nil {
		return err
	}

	defer func() { _ = db.Close() }()

	if migrateErr := sqlite.Migrate(ctx, db); migrateErr != nil {
		return migrateErr
	}

	document, err := erd.New(sqlite.NewStore(db)).Document(ctx)
	if err != nil {
		return err
	}

	if err := os.WriteFile(outputPath, []byte(document), filePerm); err != nil {
		return fmt.Errorf("write %s: %w", outputPath, err)
	}

	logger.InfoContext(ctx, "wrote the entity relationship diagram", slog.String("path", outputPath))

	return nil
}
