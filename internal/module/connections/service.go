package connections

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const (
	stateTTL        = 10 * time.Minute
	accessHeadstart = time.Minute
)

type Service struct {
	store      Store
	settings   SettingStore
	sealer     seal.Sealer
	authorizer Authorizer
	clock      TimeSource
}

type TimeSource interface{ Now() time.Time }

func New(
	store Store,
	settings SettingStore,
	sealer seal.Sealer,
	authorizer Authorizer,
	clock TimeSource,
) *Service {
	return &Service{
		store: store, settings: settings, sealer: sealer, authorizer: authorizer, clock: clock,
	}
}

var _ Contract = (*Service)(nil)

func (s *Service) Status(ctx context.Context) (entity.Connection, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Connections.Status")
	defer endSpan()

	return s.store.ConnectionByProvider(ctx, s.authorizer.Name())
}

func (s *Service) Start(ctx context.Context, in StartInput) (Authorization, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Connections.Start")
	defer endSpan()

	clientID := strings.TrimSpace(in.ClientID)
	clientSecret := strings.TrimSpace(in.ClientSecret)
	redirect := strings.TrimSpace(in.RedirectURL)

	if clientID == "" || clientSecret == "" || redirect == "" {
		return Authorization{}, ErrClientMissing
	}

	//nolint:gosec // G117: the envelope is sealed before it is stored and never logged
	stored, err := json.Marshal(clientRecord{
		ClientID: clientID, ClientSecret: clientSecret, RedirectURL: redirect,
	})
	if err != nil {
		return Authorization{}, fmt.Errorf("encode client: %w", err)
	}

	sealed, err := s.sealer.Seal(ctx, stored)
	if err != nil {
		return Authorization{}, fmt.Errorf("seal client: %w", err)
	}

	if err := s.settings.SetSetting(ctx, constant.SettingGoogleClient, sealed); err != nil {
		return Authorization{}, fmt.Errorf("store client: %w", err)
	}

	state := s.signState(s.clock.Now())

	return Authorization{
		State: state,
		AuthorizeURL: s.authorizer.Authorize(AuthorizeParams{
			ClientID:    clientID,
			RedirectURL: redirect,
			State:       state,
			Scopes:      s.authorizer.Scopes(),
		}),
	}, nil
}

func (s *Service) Complete(ctx context.Context, in CompleteInput) (entity.Connection, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Connections.Complete")
	defer endSpan()

	if !s.validState(in.State, s.clock.Now()) {
		return entity.Connection{}, ErrStateInvalid
	}

	client, err := s.loadClient(ctx)
	if err != nil {
		return entity.Connection{}, err
	}

	grant, err := s.authorizer.Exchange(ctx, ExchangeParams{
		ClientID:     client.ClientID,
		ClientSecret: client.ClientSecret,
		RedirectURL:  client.RedirectURL,
		Code:         in.Code,
	})
	if err != nil {
		return entity.Connection{}, err
	}

	now := s.clock.Now()

	existing, found, err := s.store.ConnectionByProvider(ctx, s.authorizer.Name())
	if err != nil {
		return entity.Connection{}, err
	}

	// A provider only returns the refresh token on the first consent, so a repeat
	// authorisation keeps the one already stored.
	refresh := grant.RefreshToken
	if refresh == "" && found {
		refresh = existing.RefreshToken
	}

	sealedRefresh, sealedAccess, err := s.sealTokens(ctx, refresh, grant.AccessToken)
	if err != nil {
		return entity.Connection{}, err
	}

	scopes := grant.Scopes
	if found {
		scopes = union(existing.Scopes, scopes)
	}

	connection := entity.Connection{
		Provider:        s.authorizer.Name(),
		Account:         grant.Account,
		ExternalSub:     grant.Sub,
		Scopes:          scopes,
		RefreshToken:    sealedRefresh,
		AccessToken:     sealedAccess,
		AccessExpiresAt: now.Add(grant.ExpiresIn),
		Status:          constant.ConnectionStatusActive,
		LastRefreshedAt: now,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if found {
		connection.Ref = existing.Ref
		connection.CreatedAt = existing.CreatedAt
	}

	return s.store.SaveConnection(ctx, connection)
}

func (s *Service) Token(ctx context.Context) (string, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Connections.Token")
	defer endSpan()

	connection, found, err := s.store.ConnectionByProvider(ctx, s.authorizer.Name())
	if err != nil {
		return "", err
	}

	if !found {
		return "", ErrNotConnected
	}

	if !connection.Usable() {
		return "", ErrReauthRequired
	}

	now := s.clock.Now()

	if connection.AccessToken != "" && connection.AccessExpiresAt.After(now.Add(accessHeadstart)) {
		return s.open(ctx, connection.AccessToken)
	}

	client, err := s.loadClient(ctx)
	if err != nil {
		return "", err
	}

	refresh, err := s.open(ctx, connection.RefreshToken)
	if err != nil {
		return "", err
	}

	grant, err := s.authorizer.Refresh(ctx, RefreshParams{
		ClientID:     client.ClientID,
		ClientSecret: client.ClientSecret,
		RefreshToken: refresh,
	})
	if err != nil {
		if errors.Is(err, ErrReauthRequired) {
			s.markReauth(ctx, connection, now)
		}

		return "", err
	}

	sealedAccess, err := s.sealer.Seal(ctx, []byte(grant.AccessToken))
	if err != nil {
		return "", fmt.Errorf("seal access token: %w", err)
	}

	connection.AccessToken = sealedAccess
	connection.AccessExpiresAt = now.Add(grant.ExpiresIn)
	connection.LastRefreshedAt = now
	connection.UpdatedAt = now
	connection.Status = constant.ConnectionStatusActive

	if _, err := s.store.SaveConnection(ctx, connection); err != nil {
		return "", err
	}

	return grant.AccessToken, nil
}

func (s *Service) Revoke(ctx context.Context) (entity.Connection, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Connections.Revoke")
	defer endSpan()

	connection, found, err := s.store.ConnectionByProvider(ctx, s.authorizer.Name())
	if err != nil {
		return entity.Connection{}, err
	}

	if !found {
		return entity.Connection{}, fmt.Errorf("%w: %w", entity.ErrNotFound, ErrNotConnected)
	}

	if token, openErr := s.open(ctx, connection.RefreshToken); openErr == nil && token != "" {
		_ = s.authorizer.Revoke(ctx, token)
	}

	revoked, found, err := s.store.RevokeConnection(ctx, connection.Ref, s.clock.Now())
	if err != nil {
		return entity.Connection{}, err
	}

	if !found {
		return entity.Connection{}, fmt.Errorf("%w: connection %s", entity.ErrNotFound,
			connection.Ref)
	}

	return revoked, nil
}

func (s *Service) markReauth(ctx context.Context, connection entity.Connection, at time.Time) {
	connection.Status = constant.ConnectionStatusReauthRequired
	connection.UpdatedAt = at

	_, _ = s.store.SaveConnection(ctx, connection)
}

type clientRecord struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	RedirectURL  string `json:"redirect_url"`
}

func (s *Service) loadClient(ctx context.Context) (clientRecord, error) {
	sealed, found, err := s.settings.Setting(ctx, constant.SettingGoogleClient)
	if err != nil {
		return clientRecord{}, err
	}

	if !found {
		return clientRecord{}, ErrClientMissing
	}

	plain, err := s.sealer.Open(ctx, sealed)
	if err != nil {
		return clientRecord{}, fmt.Errorf("open client: %w", err)
	}

	var client clientRecord
	if err := json.Unmarshal(plain, &client); err != nil {
		return clientRecord{}, fmt.Errorf("decode client: %w", err)
	}

	return client, nil
}

func (s *Service) sealTokens(ctx context.Context, refresh, access string) (string, string, error) {
	if refresh == "" {
		return "", "", fmt.Errorf("%w: the provider returned no refresh token", ErrProviderFailed)
	}

	sealedRefresh, err := s.sealer.Seal(ctx, []byte(refresh))
	if err != nil {
		return "", "", fmt.Errorf("seal refresh token: %w", err)
	}

	sealedAccess := ""

	if access != "" {
		if sealedAccess, err = s.sealer.Seal(ctx, []byte(access)); err != nil {
			return "", "", fmt.Errorf("seal access token: %w", err)
		}
	}

	return sealedRefresh, sealedAccess, nil
}

func (s *Service) open(ctx context.Context, sealed string) (string, error) {
	if sealed == "" {
		return "", nil
	}

	plain, err := s.sealer.Open(ctx, sealed)
	if err != nil {
		return "", fmt.Errorf("open token: %w", err)
	}

	return string(plain), nil
}

func (s *Service) signState(at time.Time) string {
	stamp := strconv.FormatInt(at.Unix(), 10)

	return stamp + "." + s.sealer.Digest("connection-state:"+stamp)
}

func (s *Service) validState(state string, now time.Time) bool {
	stamp, mac, found := strings.Cut(state, ".")
	if !found {
		return false
	}

	if subtle.ConstantTimeCompare([]byte(mac), []byte(s.sealer.Digest("connection-state:"+stamp))) != 1 {
		return false
	}

	at, err := strconv.ParseInt(stamp, 10, 64)
	if err != nil {
		return false
	}

	issued := time.Unix(at, 0).UTC()

	return now.Sub(issued) <= stateTTL && now.Sub(issued) >= -stateTTL
}

func union(existing, added []string) []string {
	out := make([]string, 0, len(existing)+len(added))
	seen := make(map[string]bool, len(existing)+len(added))

	for _, scope := range append(append([]string{}, existing...), added...) {
		if scope == "" || seen[scope] {
			continue
		}

		seen[scope] = true
		out = append(out, scope)
	}

	return out
}
