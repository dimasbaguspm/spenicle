package firstboot_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/common/firstboot"
)

func TestWriteLandsOnTheVolume(t *testing.T) {
	tests := []struct {
		name   string
		secret string
		want   string
	}{
		{name: "a generated password", secret: "BLqJcz13_IwTYjCt8qGjmprh", want: "BLqJcz13_IwTYjCt8qGjmprh\n"},
		{name: "the newline is added once", secret: "trailing\n", want: "trailing\n\n"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()

			path, err := firstboot.Write(t.Context(), dir, tc.secret)
			if err != nil {
				t.Fatalf("write: %v", err)
			}

			if want := filepath.Join(dir, firstboot.FileName); path != want {
				t.Fatalf("path = %q, want %q", path, want)
			}

			body, err := os.ReadFile(path)
			if err != nil {
				t.Fatalf("read: %v", err)
			}

			if string(body) != tc.want {
				t.Fatalf("body = %q, want %q", body, tc.want)
			}

			info, err := os.Stat(path)
			if err != nil {
				t.Fatalf("stat: %v", err)
			}

			if mode := info.Mode().Perm(); mode != 0o600 {
				t.Fatalf("mode = %o, want 600", mode)
			}
		})
	}
}

func TestRemoveLeavesNothingAndToleratesASecondCall(t *testing.T) {
	dir := t.TempDir()

	path, err := firstboot.Write(t.Context(), dir, "s3cret")
	if err != nil {
		t.Fatalf("write: %v", err)
	}

	if err := firstboot.Remove(t.Context(), dir); err != nil {
		t.Fatalf("remove: %v", err)
	}

	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("file survived the remove: %v", err)
	}

	if err := firstboot.Remove(t.Context(), dir); err != nil {
		t.Fatalf("a second remove must be a no-op: %v", err)
	}
}
