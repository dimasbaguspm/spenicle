// Package firstboot owns the one-time claim file a fresh instance writes to its data
// volume: the instance password the boot generated, readable by whoever can read the
// volume. It is removed by the first password change, because from then on the operator
// owns the credential and the file must not be a second copy of it.
package firstboot

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

const (
	// FileName is inside the data directory, so it travels with the volume and it is
	// the one place the generated password is written.
	FileName = "first-boot.txt"

	fileMode = 0o600
	dirMode  = 0o750
)

func Path(dir string) string {
	return filepath.Join(dir, FileName)
}

func Write(ctx context.Context, dir, secret string) (string, error) {
	_, endSpan := telemetry.StartSpan(ctx, "Common.FirstBoot.Write")
	defer endSpan()

	if err := os.MkdirAll(dir, dirMode); err != nil {
		return "", fmt.Errorf("first-boot secret dir: %w", err)
	}

	path := Path(dir)

	// OpenFile rather than os.WriteFile: the mode is the point of this file, so it is
	// stated here and reviewed once (0600), instead of being implied by a helper.
	file, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, fileMode)
	if err != nil {
		return "", fmt.Errorf("first-boot secret: %w", err)
	}

	if _, err := file.WriteString(secret + "\n"); err != nil {
		_ = file.Close()

		return "", fmt.Errorf("first-boot secret: %w", err)
	}

	if err := file.Close(); err != nil {
		return "", fmt.Errorf("first-boot secret: %w", err)
	}

	return path, nil
}

func Remove(ctx context.Context, dir string) error {
	_, endSpan := telemetry.StartSpan(ctx, "Common.FirstBoot.Remove")
	defer endSpan()

	if err := os.Remove(Path(dir)); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return fmt.Errorf("first-boot secret: %w", err)
	}

	return nil
}
