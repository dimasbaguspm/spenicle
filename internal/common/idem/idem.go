// Package idem mints the idempotency key a client no longer has to invent: the
// calling credential's identity, an underscore, and sixteen hex characters of
// entropy. A key a client sends is accepted as it is; a key we mint is echoed in
// the response, so a retry can replay it.
package idem

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"regexp"
	"strings"

	"github.com/dimasbaguspm/spenicle/internal/common/actor"
)

const (
	RootPrefix  = "root"
	randomBytes = 8
	separator   = "_"
)

var shape = regexp.MustCompile(`^(root|[0-9a-f]{32})_[0-9a-f]{16}$`) //nolint:gochecknoglobals,lll // one pattern

func Prefix(ctx context.Context) string {
	if ref := actor.Of(ctx).Ref; ref != "" {
		return ref
	}

	return RootPrefix
}

func Mint(ctx context.Context) (string, error) {
	raw := make([]byte, randomBytes)

	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("mint idempotency key: %w", err)
	}

	return Prefix(ctx) + separator + hex.EncodeToString(raw), nil
}

func Valid(key string) bool {
	return shape.MatchString(key)
}

func Normalize(key string) string {
	return strings.TrimSpace(key)
}
