package filestore_test

import (
	"bytes"
	"errors"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/filestore"
)

const testSecret = "filestore-test-secret-0123456789"

func newTestStore(t *testing.T) (*filestore.Store, string) {
	t.Helper()

	dir := t.TempDir()

	store, err := filestore.New(dir, []byte(testSecret))
	if err != nil {
		t.Fatalf("new store: %v", err)
	}

	return store, dir
}

func compressiblePayload() extraction.Artifact {
	return extraction.Artifact{
		Filename:    "receipt.txt",
		ContentType: "text/plain",
		Bytes:       []byte(strings.Repeat("kopi kenangan 25000 IDR\n", 200)),
	}
}

func opaquePayload() extraction.Artifact {
	body := make([]byte, 512)
	for i := range body {
		body[i] = byte(i * 7)
	}

	return extraction.Artifact{
		Filename:    "receipt.jpg",
		ContentType: "image/jpeg",
		Bytes:       body,
	}
}

func artifactPath(dir, sha string) string {
	return filepath.Join(dir, sha[0:2], sha[2:4], sha)
}

func readAll(t *testing.T, store *filestore.Store, sha string) []byte {
	t.Helper()

	body, err := store.Open(t.Context(), sha)
	if err != nil {
		t.Fatalf("open artifact: %v", err)
	}

	defer func() { _ = body.Close() }()

	raw, err := io.ReadAll(body)
	if err != nil {
		t.Fatalf("read artifact: %v", err)
	}

	return raw
}

func storeFiles(t *testing.T, dir string) []string {
	t.Helper()

	var found []string

	err := filepath.WalkDir(dir, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if !entry.IsDir() {
			found = append(found, path)
		}

		return nil
	})
	if err != nil {
		t.Fatalf("walk %s: %v", dir, err)
	}

	return found
}

func TestPutOpenRoundtrip(t *testing.T) {
	store, _ := newTestStore(t)

	for _, artifact := range []extraction.Artifact{compressiblePayload(), opaquePayload()} {
		record, err := store.Put(t.Context(), artifact)
		if err != nil {
			t.Fatalf("put %s: %v", artifact.Filename, err)
		}

		if record.PlainBytes != int64(len(artifact.Bytes)) {
			t.Fatalf("%s: plain bytes is %d, want %d", artifact.Filename, record.PlainBytes, len(artifact.Bytes))
		}

		if got := readAll(t, store, record.SHA256); !bytes.Equal(got, artifact.Bytes) {
			t.Fatalf("%s: roundtrip changed the payload", artifact.Filename)
		}
	}
}

func TestCompressibleArtifactIsStoredSmaller(t *testing.T) {
	store, _ := newTestStore(t)

	packed, err := store.Put(t.Context(), compressiblePayload())
	if err != nil {
		t.Fatalf("put compressible: %v", err)
	}

	raw, err := store.Put(t.Context(), opaquePayload())
	if err != nil {
		t.Fatalf("put opaque: %v", err)
	}

	if packed.StoredBytes >= packed.PlainBytes {
		t.Fatalf("compressed artifact stored %d bytes for %d plain, want fewer",
			packed.StoredBytes, packed.PlainBytes)
	}

	if raw.StoredBytes <= raw.PlainBytes {
		t.Fatalf("opaque artifact stored %d bytes for %d plain, want the raw size plus the header",
			raw.StoredBytes, raw.PlainBytes)
	}
}

func TestPutTwiceWritesOneFile(t *testing.T) {
	store, dir := newTestStore(t)

	first, err := store.Put(t.Context(), compressiblePayload())
	if err != nil {
		t.Fatalf("first put: %v", err)
	}

	second, err := store.Put(t.Context(), compressiblePayload())
	if err != nil {
		t.Fatalf("second put: %v", err)
	}

	if first.SHA256 != second.SHA256 {
		t.Fatalf("the same bytes hashed to %s then %s", first.SHA256, second.SHA256)
	}

	if first.StoredBytes != second.StoredBytes {
		t.Fatalf("dedupe reported %d then %d stored bytes", first.StoredBytes, second.StoredBytes)
	}

	if files := storeFiles(t, dir); len(files) != 1 {
		t.Fatalf("the same payload twice left %d files, want 1: %v", len(files), files)
	}
}

func TestOpenWithAnotherSecretFails(t *testing.T) {
	store, dir := newTestStore(t)

	record, err := store.Put(t.Context(), compressiblePayload())
	if err != nil {
		t.Fatalf("put: %v", err)
	}

	other, err := filestore.New(dir, []byte("a-different-secret-0123456789"))
	if err != nil {
		t.Fatalf("new store: %v", err)
	}

	if _, err := other.Open(t.Context(), record.SHA256); !errors.Is(err, filestore.ErrCorrupt) {
		t.Fatalf("opening with another secret answered %v, want ErrCorrupt", err)
	}
}

func TestOpenRefusesATamperedFile(t *testing.T) {
	store, dir := newTestStore(t)

	record, err := store.Put(t.Context(), compressiblePayload())
	if err != nil {
		t.Fatalf("put: %v", err)
	}

	path := artifactPath(dir, record.SHA256)

	sealed, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read sealed file: %v", err)
	}

	sealed[len(sealed)-1] ^= 0xff

	if err := os.WriteFile(path, sealed, 0o600); err != nil {
		t.Fatalf("write tampered file: %v", err)
	}

	if _, err := store.Open(t.Context(), record.SHA256); !errors.Is(err, filestore.ErrCorrupt) {
		t.Fatalf("opening a tampered file answered %v, want ErrCorrupt", err)
	}
}

func TestRemoveIsIdempotent(t *testing.T) {
	store, _ := newTestStore(t)

	record, err := store.Put(t.Context(), opaquePayload())
	if err != nil {
		t.Fatalf("put: %v", err)
	}

	if err := store.Remove(t.Context(), record.SHA256); err != nil {
		t.Fatalf("first remove: %v", err)
	}

	if err := store.Remove(t.Context(), record.SHA256); err != nil {
		t.Fatalf("second remove: %v", err)
	}

	if _, err := store.Open(t.Context(), record.SHA256); !errors.Is(err, filestore.ErrNotFound) {
		t.Fatalf("opening a removed artifact answered %v, want ErrNotFound", err)
	}
}
