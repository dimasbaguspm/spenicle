package tokens

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const (
	tokenPrefix = "spl_"
	tokenBytes  = 32
)

type Service struct {
	store    Store
	digestor Digestor
	clock    TimeSource
}

func New(store Store, digestor Digestor, clock TimeSource) *Service {
	return &Service{store: store, digestor: digestor, clock: clock}
}

var _ Contract = (*Service)(nil)

func (s *Service) Create(ctx context.Context, in CreateInput) (entity.Token, string, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Tokens.Create")
	defer endSpan()

	name := strings.TrimSpace(in.Name)
	if name == "" {
		return entity.Token{}, "", entity.ErrTokenName
	}

	scopes, err := knownScopes(in.Scopes)
	if err != nil {
		return entity.Token{}, "", err
	}

	plain, err := newToken()
	if err != nil {
		return entity.Token{}, "", err
	}

	saved, err := s.store.InsertToken(ctx, entity.Token{
		Name:      name,
		Preview:   maskToken(plain),
		Digest:    s.digestor.Digest(plain),
		Scopes:    scopes,
		CreatedAt: s.clock.Now(),
	})
	if err != nil {
		return entity.Token{}, "", err
	}

	return saved, plain, nil
}

func (s *Service) List(ctx context.Context, filter entity.TokenFilter) ([]entity.Token, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Tokens.List")
	defer endSpan()

	return s.store.ListTokens(ctx, filter)
}

func (s *Service) Revoke(ctx context.Context, ref string) (entity.Token, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Tokens.Revoke")
	defer endSpan()

	token, found, err := s.store.RevokeToken(ctx, ref, s.clock.Now())
	if err != nil {
		return entity.Token{}, err
	}

	if !found {
		return entity.Token{}, fmt.Errorf("%w: token %s", entity.ErrNotFound, ref)
	}

	return token, nil
}

// Verify answers the token behind a Bearer credential. A revoked token is not
// found: the row stays for the journal, the credential does not work.
func (s *Service) Verify(ctx context.Context, plain string) (entity.Token, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Tokens.Verify")
	defer endSpan()

	trimmed := strings.TrimSpace(plain)
	if trimmed == "" {
		return entity.Token{}, false, nil
	}

	token, found, err := s.store.TokenByDigest(ctx, s.digestor.Digest(trimmed))
	if err != nil || !found {
		return entity.Token{}, false, err
	}

	if !token.Active() {
		return entity.Token{}, false, nil
	}

	if err := s.store.TouchToken(ctx, token.Ref, s.clock.Now()); err != nil {
		return entity.Token{}, false, err
	}

	return token, true, nil
}

func knownScopes(want []string) ([]string, error) {
	scopes := make([]string, 0, len(want))
	seen := make(map[string]bool, len(want))

	for _, scope := range want {
		trimmed := strings.TrimSpace(scope)
		if trimmed == "" || seen[trimmed] {
			continue
		}

		if !entity.KnownScope(trimmed) {
			return nil, fmt.Errorf("%w: %q", entity.ErrUnknownScope, trimmed)
		}

		seen[trimmed] = true
		scopes = append(scopes, trimmed)
	}

	if len(scopes) == 0 {
		return nil, entity.ErrScopeMissing
	}

	return scopes, nil
}

// maskToken is the only trace of the plaintext that survives creation: four
// characters at each edge, so two tokens are told apart without either leaking.
func maskToken(plain string) string {
	const edge = 4

	secret := strings.TrimPrefix(plain, tokenPrefix)
	if len(secret) <= edge*2 {
		return tokenPrefix + "\u2026"
	}

	return tokenPrefix + secret[:edge] + "\u2026" + secret[len(secret)-edge:]
}

func newToken() (string, error) {
	raw := make([]byte, tokenBytes)

	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("token entropy: %w", err)
	}

	return tokenPrefix + hex.EncodeToString(raw), nil
}
