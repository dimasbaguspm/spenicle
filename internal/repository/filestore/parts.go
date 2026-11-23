package filestore

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

const (
	partSuffix   = ".part"
	partDirPerm  = 0o750
	partFilePerm = 0o600
)

type Parts struct{ dir string }

func NewParts(dir string) (*Parts, error) {
	if strings.TrimSpace(dir) == "" {
		return nil, errors.New("part store needs a directory")
	}

	if err := os.MkdirAll(dir, partDirPerm); err != nil {
		return nil, fmt.Errorf("create import dir: %w", err)
	}

	return &Parts{dir: dir}, nil
}

func (p *Parts) Append(ctx context.Context, key string, chunk []byte) (int64, error) {
	_, endSpan := telemetry.StartSpan(ctx, "Filestore.Append")
	defer endSpan()

	file, err := os.OpenFile(p.path(key), os.O_CREATE|os.O_WRONLY|os.O_APPEND, partFilePerm)
	if err != nil {
		return 0, fmt.Errorf("open import part: %w", err)
	}

	if _, writeErr := file.Write(chunk); writeErr != nil {
		_ = file.Close()

		return 0, fmt.Errorf("append import part: %w", writeErr)
	}

	if closeErr := file.Close(); closeErr != nil {
		return 0, fmt.Errorf("close import part: %w", closeErr)
	}

	info, err := os.Stat(p.path(key))
	if err != nil {
		return 0, fmt.Errorf("stat import part: %w", err)
	}

	return info.Size(), nil
}

func (p *Parts) Read(ctx context.Context, key string) ([]byte, error) {
	_, endSpan := telemetry.StartSpan(ctx, "Filestore.ReadPart")
	defer endSpan()

	body, err := os.ReadFile(p.path(key))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, fmt.Errorf("%w: import part %s", ErrNotFound, key)
		}

		return nil, fmt.Errorf("read import part: %w", err)
	}

	return body, nil
}

func (p *Parts) Open(ctx context.Context, key string) (io.ReadCloser, error) {
	_, endSpan := telemetry.StartSpan(ctx, "Filestore.OpenPart")
	defer endSpan()

	file, err := os.Open(p.path(key))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, fmt.Errorf("%w: import part %s", ErrNotFound, key)
		}

		return nil, fmt.Errorf("open import part: %w", err)
	}

	return file, nil
}

func (p *Parts) Remove(ctx context.Context, key string) error {
	_, endSpan := telemetry.StartSpan(ctx, "Filestore.RemovePart")
	defer endSpan()

	err := os.Remove(p.path(key))
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("remove import part: %w", err)
	}

	return nil
}

func safeKey(key string) string {
	safe := strings.Map(func(char rune) rune {
		switch {
		case char >= 'a' && char <= 'z':
			return char
		case char >= 'A' && char <= 'Z':
			return char
		case char >= '0' && char <= '9':
			return char
		case char == '-', char == '_', char == '.':
			return char
		default:
			return '_'
		}
	}, key)

	if safe == "" {
		return "_"
	}

	return safe
}

func (p *Parts) Truncate(ctx context.Context, key string, size int64) error {
	_, endSpan := telemetry.StartSpan(ctx, "Filestore.TruncatePart")
	defer endSpan()

	if err := os.Truncate(p.path(key), size); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("truncate import part: %w", err)
	}

	return nil
}

func (p *Parts) path(key string) string {
	return filepath.Join(p.dir, safeKey(key)+partSuffix)
}
