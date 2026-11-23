// Package seal encrypts the sensitive columns and artifacts under APP_SECRET.
// The ledger deliberately stays plaintext: losing the secret must never cost
// financial history.
package seal

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

const (
	envelopePrefix = "v1:"
	fingerprintLen = 16
	minSecretBytes = 16
)

var (
	ErrNotSealed = errors.New("value is not sealed")
	ErrNoSecret  = errors.New("APP_SECRET is required")
)

type Sealer interface {
	Seal(ctx context.Context, plain []byte) (string, error)
	Open(ctx context.Context, sealed string) ([]byte, error)
	Fingerprint() string
}

type AES struct {
	aead        cipher.AEAD
	fingerprint string
}

func New(secret string) (*AES, error) {
	if secret == "" {
		return nil, ErrNoSecret
	}

	if len(secret) < minSecretBytes {
		return nil, errors.New("APP_SECRET must be at least 16 bytes")
	}

	key := sha256.Sum256([]byte("spenicle/seal/v1\x00" + secret))

	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, fmt.Errorf("cipher: %w", err)
	}

	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("gcm: %w", err)
	}

	mac := hmac.New(sha256.New, key[:])
	mac.Write([]byte("fingerprint"))
	fingerprint := hex.EncodeToString(mac.Sum(nil))[:fingerprintLen]

	return &AES{aead: aead, fingerprint: fingerprint}, nil
}

func (s *AES) Seal(ctx context.Context, plain []byte) (string, error) {
	_, endSpan := telemetry.StartSpan(ctx, "Common.Seal.Seal")
	defer endSpan()

	nonce := make([]byte, s.aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", fmt.Errorf("nonce: %w", err)
	}

	out := s.aead.Seal(nonce, nonce, plain, nil)

	return envelopePrefix + base64.StdEncoding.EncodeToString(out), nil
}

func (s *AES) Open(ctx context.Context, sealed string) ([]byte, error) {
	_, endSpan := telemetry.StartSpan(ctx, "Common.Seal.Open")
	defer endSpan()

	if !strings.HasPrefix(sealed, envelopePrefix) {
		return nil, ErrNotSealed
	}

	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(sealed, envelopePrefix))
	if err != nil {
		return nil, fmt.Errorf("decode envelope: %w", err)
	}

	if len(raw) < s.aead.NonceSize() {
		return nil, errors.New("sealed value is truncated")
	}

	nonce, body := raw[:s.aead.NonceSize()], raw[s.aead.NonceSize():]

	plain, err := s.aead.Open(nil, nonce, body, nil)
	if err != nil {
		return nil, fmt.Errorf("open envelope: %w", err)
	}

	return plain, nil
}

func (s *AES) Fingerprint() string { return s.fingerprint }
