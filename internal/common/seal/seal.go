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
	// minSecretBytes is the shortest secret worth deriving a key from.
	minSecretBytes = 16
)

var (
	// ErrNotSealed reports data that was never sealed.
	ErrNotSealed = errors.New("value is not sealed")
	// ErrNoSecret reports a sealer built without APP_SECRET.
	ErrNoSecret = errors.New("APP_SECRET is required")
)

// Sealer is the contract the rest of the code depends on. Swapping AES-GCM for a
// KMS call later means one new implementation, no call-site changes; the context
// is there because a remote key service is a network call.
type Sealer interface {
	Seal(ctx context.Context, plain []byte) (string, error)
	Open(ctx context.Context, sealed string) ([]byte, error)
	// Fingerprint is an accessor, not a unit of work: it never blocks, so it
	// takes no context and opens no span.
	Fingerprint() string
}

// AES seals with AES-256-GCM.
type AES struct {
	aead        cipher.AEAD
	fingerprint string
}

// New derives a key from the secret. The secret itself is never stored.
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

// Seal returns "v1:" plus base64(nonce|ciphertext).
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

// Open reverses Seal.
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

// Fingerprint identifies the secret without revealing it.
func (s *AES) Fingerprint() string { return s.fingerprint }
