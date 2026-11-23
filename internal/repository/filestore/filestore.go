// Package filestore keeps the uploaded capture artifacts outside the database:
// content addressed, gzipped when that helps, encrypted at rest with a key derived
// from APP_SECRET. The row holds the metadata, the file holds the bytes, so losing
// one file costs one document and never a capture.
//
// The layout is `<dir>/<sha[0:2]>/<sha[2:4]>/<sha256>`: the same bytes uploaded
// twice resolve to the same path, so a re-share of the same receipt is one file.
// Every file starts with the magic `SPN1`, one flags byte (bit 0 = gzip), the AES
// nonce and the ciphertext. The plaintext sha256 is the additional authenticated
// data, so a file swapped into another artifact's path fails to decrypt.
package filestore

import (
	"bytes"
	"compress/gzip"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hkdf"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
)

const (
	magic = "SPN1"

	keyInfo  = "spenicle/artifact/v1"
	keyBytes = 32

	flagGzip = 1 << 0

	shaHexLen  = 64
	shardLen   = 2
	dirPerm    = 0o750
	tempPrefix = "artifact-"
)

var (
	ErrNotFound = errors.New("artifact file is not there")
	ErrCorrupt  = errors.New("artifact file does not authenticate")
)

type Record struct {
	SHA256      string
	ContentType string
	Filename    string
	PlainBytes  int64
	StoredBytes int64
}

type Store struct {
	dir  string
	aead cipher.AEAD
}

func New(dir string, secret []byte) (*Store, error) {
	if len(secret) == 0 {
		return nil, errors.New("artifact store needs APP_SECRET")
	}

	key, err := hkdf.Key(sha256.New, secret, nil, keyInfo, keyBytes)
	if err != nil {
		return nil, fmt.Errorf("derive artifact key: %w", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("artifact cipher: %w", err)
	}

	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("artifact gcm: %w", err)
	}

	if err := os.MkdirAll(dir, dirPerm); err != nil {
		return nil, fmt.Errorf("create artifact dir: %w", err)
	}

	return &Store{dir: dir, aead: aead}, nil
}

func (s *Store) Put(ctx context.Context, artifact extraction.Artifact) (Record, error) {
	_, endSpan := telemetry.StartSpan(ctx, "Filestore.Put")
	defer endSpan()

	sum := sha256.Sum256(artifact.Bytes)
	sha := hex.EncodeToString(sum[:])

	record := Record{
		SHA256:      sha,
		ContentType: artifact.ContentType,
		Filename:    artifact.Filename,
		PlainBytes:  int64(len(artifact.Bytes)),
	}

	if size, found := s.existing(sha); found {
		record.StoredBytes = size

		return record, nil
	}

	sealed, err := s.seal(sha, artifact)
	if err != nil {
		return Record{}, err
	}

	if writeErr := s.write(sha, sealed); writeErr != nil {
		return Record{}, writeErr
	}

	record.StoredBytes = int64(len(sealed))

	return record, nil
}

func (s *Store) Open(ctx context.Context, sha string) (io.ReadCloser, error) {
	_, endSpan := telemetry.StartSpan(ctx, "Filestore.Open")
	defer endSpan()

	if !validSHA(sha) {
		return nil, fmt.Errorf("%w: %q is not a sha256", ErrNotFound, sha)
	}

	raw, err := os.ReadFile(s.path(sha))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, fmt.Errorf("%w: %s", ErrNotFound, sha)
		}

		return nil, fmt.Errorf("read artifact: %w", err)
	}

	body, flags, err := s.decode(sha, raw)
	if err != nil {
		return nil, err
	}

	return inflate(body, flags)
}

func (s *Store) Remove(ctx context.Context, sha string) error {
	_, endSpan := telemetry.StartSpan(ctx, "Filestore.Remove")
	defer endSpan()

	if !validSHA(sha) {
		return fmt.Errorf("%w: %q is not a sha256", ErrNotFound, sha)
	}

	err := os.Remove(s.path(sha))
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("remove artifact: %w", err)
	}

	return nil
}

func (s *Store) seal(sha string, artifact extraction.Artifact) ([]byte, error) {
	flags := byte(0)
	body := artifact.Bytes

	if compressible(artifact.ContentType) {
		packed, err := compress(artifact.Bytes)
		if err != nil {
			return nil, err
		}

		if len(packed) < len(artifact.Bytes) {
			flags |= flagGzip
			body = packed
		}
	}

	nonce := make([]byte, s.aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, fmt.Errorf("artifact nonce: %w", err)
	}

	out := make([]byte, 0, len(magic)+1+len(nonce)+len(body)+s.aead.Overhead())
	out = append(out, magic...)
	out = append(out, flags)
	out = append(out, nonce...)

	return s.aead.Seal(out, nonce, body, []byte(sha)), nil
}

func (s *Store) decode(sha string, raw []byte) ([]byte, byte, error) {
	header := len(magic) + 1 + s.aead.NonceSize()

	if len(raw) < header {
		return nil, 0, fmt.Errorf("%w: %s is truncated", ErrCorrupt, sha)
	}

	if string(raw[:len(magic)]) != magic {
		return nil, 0, fmt.Errorf("%w: %s has no %s header", ErrCorrupt, sha, magic)
	}

	flags := raw[len(magic)]
	nonce := raw[len(magic)+1 : header]

	body, err := s.aead.Open(nil, nonce, raw[header:], []byte(sha))
	if err != nil {
		return nil, 0, fmt.Errorf("%w: %s: %w", ErrCorrupt, sha, err)
	}

	return body, flags, nil
}

func (s *Store) write(sha string, sealed []byte) error {
	target := s.path(sha)
	dir := filepath.Dir(target)

	if err := os.MkdirAll(dir, dirPerm); err != nil {
		return fmt.Errorf("create artifact dir: %w", err)
	}

	temp, err := os.CreateTemp(dir, tempPrefix)
	if err != nil {
		return fmt.Errorf("artifact temp file: %w", err)
	}

	name := temp.Name()

	if _, err := temp.Write(sealed); err != nil {
		_ = temp.Close()
		_ = os.Remove(name)

		return fmt.Errorf("write artifact: %w", err)
	}

	if err := temp.Close(); err != nil {
		_ = os.Remove(name)

		return fmt.Errorf("close artifact: %w", err)
	}

	if err := os.Rename(name, target); err != nil {
		_ = os.Remove(name)

		return fmt.Errorf("store artifact: %w", err)
	}

	return nil
}

func (s *Store) existing(sha string) (int64, bool) {
	info, err := os.Stat(s.path(sha))
	if err != nil || info.IsDir() || info.Size() == 0 {
		return 0, false
	}

	return info.Size(), true
}

func (s *Store) path(sha string) string {
	return filepath.Join(s.dir, sha[0:shardLen], sha[shardLen:2*shardLen], sha)
}

func compress(body []byte) ([]byte, error) {
	var buffer bytes.Buffer

	writer := gzip.NewWriter(&buffer)

	if _, err := writer.Write(body); err != nil {
		return nil, fmt.Errorf("compress artifact: %w", err)
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("compress artifact: %w", err)
	}

	return buffer.Bytes(), nil
}

func inflate(body []byte, flags byte) (io.ReadCloser, error) {
	if flags&flagGzip == 0 {
		return io.NopCloser(bytes.NewReader(body)), nil
	}

	reader, err := gzip.NewReader(bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrCorrupt, err)
	}

	return reader, nil
}

func compressible(contentType string) bool {
	base, _, _ := strings.Cut(contentType, ";")

	switch {
	case strings.HasPrefix(base, "text/"):
		return true
	case base == "application/json":
		return true
	case base == "application/xml":
		return true
	case base == "application/pdf":
		return true
	default:
		return false
	}
}

func validSHA(sha string) bool {
	if len(sha) != shaHexLen {
		return false
	}

	_, err := hex.DecodeString(sha)

	return err == nil
}
