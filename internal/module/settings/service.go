package settings

import (
	"context"
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-playground/validator/v10"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

const (
	hashScheme     = "pbkdf2-sha256"
	hashIterations = 600_000
	hashSaltBytes  = 16
	hashKeyBytes   = 32
	hashFields     = 4

	verifiedLimit    = 8
	settingsCacheTTL = time.Hour
)

var validate = validator.New() //nolint:gochecknoglobals // one registry, built once

type passwordChange struct {
	Current string `validate:"required"`
	Next    string `validate:"required,min=12,max=200"`
}

type cachedSettings struct {
	value     entity.Settings
	expiresAt time.Time
}

type Service struct {
	store  repository.System
	sealer seal.Sealer
	clock  TimeSource

	mu       sync.Mutex
	verified map[string]bool

	cacheMu sync.RWMutex
	cache   cachedSettings
}

type TimeSource interface{ Now() time.Time }

func New(store repository.System, sealer seal.Sealer, clock TimeSource) *Service {
	return &Service{
		store: store, sealer: sealer, clock: clock,
		verified: make(map[string]bool),
	}
}

var _ Contract = (*Service)(nil)

func (s *Service) Load(ctx context.Context) (entity.Settings, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Settings.Load")
	defer endSpan()

	settings, _, err := s.cachedLoad(ctx)

	return settings, err
}

func (s *Service) BaseCurrency(ctx context.Context) (string, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Settings.BaseCurrency")
	defer endSpan()

	settings, err := s.Load(ctx)
	if err != nil {
		return "", err
	}

	return settings.BaseCurrency, nil
}

func (s *Service) EnsureInitial(
	ctx context.Context,
	initialPassword, timezone string,
) (entity.Settings, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Settings.EnsureInitial")
	defer endSpan()

	settings, exists, err := s.cachedLoad(ctx)
	if err != nil {
		return entity.Settings{}, false, err
	}

	if exists {
		return settings, false, nil
	}

	settings = entity.DefaultSettings()

	if trimmed := strings.TrimSpace(timezone); trimmed != "" {
		settings.Timezone = trimmed
	}

	// A fixture can create an instance that already answers to a password; a real boot
	// never does, so the first setup is the only place a production password is born.
	if initialPassword != "" {
		encoded, hashErr := hashPassword(initialPassword)
		if hashErr != nil {
			return entity.Settings{}, false, hashErr
		}

		settings.PasswordHash = encoded
	}

	created, err := s.create(ctx, settings)
	if err != nil {
		return entity.Settings{}, false, err
	}

	if !created {
		stored, _, loadErr := s.cachedLoad(ctx)
		if loadErr != nil {
			return entity.Settings{}, false, loadErr
		}

		return stored, false, nil
	}

	return settings, true, nil
}

func (s *Service) Authenticate(
	ctx context.Context,
	password string,
) (entity.Settings, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Settings.Authenticate")
	defer endSpan()

	settings, err := s.Load(ctx)
	if err != nil {
		return entity.Settings{}, false, err
	}

	if !settings.HasPassword() {
		return settings, false, nil
	}

	if err := verifyPassword(settings.PasswordHash, password); err != nil {
		return entity.Settings{}, true, err
	}

	return settings, true, nil
}

func (s *Service) ChangePassword(
	ctx context.Context,
	current, next string,
) (entity.Settings, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Settings.ChangePassword")
	defer endSpan()

	settings, found, err := s.Authenticate(ctx, current)
	if err != nil {
		return entity.Settings{}, err
	}

	if !found {
		return entity.Settings{}, fmt.Errorf("%w: no password is set", entity.ErrPasswordMismatch)
	}

	trimmed := strings.TrimSpace(next)

	change := passwordChange{Current: current, Next: trimmed}

	if validationErr := validate.Struct(change); validationErr != nil {
		return entity.Settings{}, entity.ErrWeakPassword
	}

	encoded, err := hashPassword(trimmed)
	if err != nil {
		return entity.Settings{}, err
	}

	settings.PasswordHash = encoded

	if err := s.save(ctx, settings); err != nil {
		return entity.Settings{}, err
	}

	return settings, nil
}

func (s *Service) Setup(
	ctx context.Context,
	password, code string,
	accounts []entity.OpeningAccount,
) (entity.Settings, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Settings.Setup")
	defer endSpan()

	trimmed := strings.TrimSpace(password)
	chosen := passwordChange{Current: trimmed, Next: trimmed}

	if err := validate.Struct(chosen); err != nil {
		return entity.Settings{}, entity.ErrWeakPassword
	}

	encoded, err := hashPassword(trimmed)
	if err != nil {
		return entity.Settings{}, err
	}

	expectedSettings, _, err := s.store.Setting(ctx, constant.SettingAppSettings)
	if err != nil {
		return entity.Settings{}, err
	}

	settings, err := s.Load(ctx)
	if err != nil {
		return entity.Settings{}, err
	}

	location, err := time.LoadLocation(settings.Timezone)
	if err != nil {
		return entity.Settings{}, fmt.Errorf("load setup timezone: %w", err)
	}

	now := s.clock.Now().In(location)
	occurredOn := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, location)

	setup, err := entity.NewSetup(code, accounts, occurredOn)
	if err != nil {
		return entity.Settings{}, err
	}

	settings.BaseCurrency = setup.BaseCurrency
	settings.PasswordHash = encoded

	sealed, err := s.encode(ctx, settings)
	if err != nil {
		return entity.Settings{}, err
	}

	if err := s.store.CompleteSetup(ctx, setup, expectedSettings, sealed); err != nil {
		return entity.Settings{}, err
	}

	s.InvalidateCache()

	return settings, nil
}

func (s *Service) EnsureTimezone(ctx context.Context, name string) (entity.Settings, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Settings.EnsureTimezone")
	defer endSpan()

	settings, err := s.Load(ctx)
	if err != nil {
		return entity.Settings{}, err
	}

	stored := settings.Timezone

	if name == "" || name == stored {
		return settings, nil
	}

	return entity.Settings{}, fmt.Errorf("%w: stored %q, env %q",
		entity.ErrTimezoneSetOnce, stored, name)
}

// Root answers whether a presented credential is the instance password. PBKDF2 is
// deliberately slow, so a verified credential is remembered as a digest until the
// one-hour settings cache expires or a password change invalidates it: the key
// includes the stored hash, so a password change cannot leave an old credential usable.
func (s *Service) Root(ctx context.Context, presented string) (bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Settings.Root")
	defer endSpan()

	settings, found, err := s.cachedLoad(ctx)
	if err != nil {
		return false, err
	}

	if !found {
		return false, nil
	}

	return s.root(settings, presented), nil
}

func (s *Service) RootWithSettings(
	ctx context.Context,
	current entity.Settings,
	presented string,
) (bool, error) {
	_, endSpan := telemetry.StartSpan(ctx, "Module.Settings.RootWithSettings")
	defer endSpan()

	return s.root(current, presented), nil
}

func (s *Service) InvalidateCache() {
	s.cacheMu.Lock()
	s.cache = cachedSettings{}
	s.cacheMu.Unlock()

	s.mu.Lock()
	s.verified = make(map[string]bool, verifiedLimit)
	s.mu.Unlock()
}

func (s *Service) root(settings entity.Settings, presented string) bool {
	trimmed := strings.TrimSpace(presented)
	if trimmed == "" || !settings.HasPassword() {
		return false
	}

	key := credentialDigest(settings.PasswordHash, trimmed)

	s.mu.Lock()
	remembered := s.verified[key]
	s.mu.Unlock()

	if remembered {
		return true
	}

	if verifyErr := verifyPassword(settings.PasswordHash, trimmed); verifyErr != nil {
		return false
	}

	s.remember(key)

	return true
}

func (s *Service) remember(key string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.verified) >= verifiedLimit {
		s.verified = make(map[string]bool, verifiedLimit)
	}

	s.verified[key] = true
}

func credentialDigest(passwordHash, presented string) string {
	sum := sha256.Sum256([]byte(passwordHash + "\x00" + presented))

	return hex.EncodeToString(sum[:])
}

func hashPassword(password string) (string, error) {
	salt := make([]byte, hashSaltBytes)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("password salt: %w", err)
	}

	key, err := pbkdf2.Key(sha256.New, password, salt, hashIterations, hashKeyBytes)
	if err != nil {
		return "", fmt.Errorf("password hash: %w", err)
	}

	return strings.Join([]string{
		hashScheme,
		strconv.Itoa(hashIterations),
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	}, "$"), nil
}

func verifyPassword(encoded, password string) error {
	parts := strings.Split(encoded, "$")
	if len(parts) != hashFields || parts[0] != hashScheme {
		return fmt.Errorf("%w: unsupported password hash", entity.ErrPasswordMismatch)
	}

	iterations, err := strconv.Atoi(parts[1])
	if err != nil || iterations <= 0 {
		return fmt.Errorf("%w: bad iteration count", entity.ErrPasswordMismatch)
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[2])
	if err != nil {
		return fmt.Errorf("%w: bad salt", entity.ErrPasswordMismatch)
	}

	want, err := base64.RawStdEncoding.DecodeString(parts[3])
	if err != nil {
		return fmt.Errorf("%w: bad digest", entity.ErrPasswordMismatch)
	}

	got, err := pbkdf2.Key(sha256.New, password, salt, iterations, len(want))
	if err != nil {
		return fmt.Errorf("password hash: %w", err)
	}

	if subtle.ConstantTimeCompare(got, want) != 1 {
		return entity.ErrPasswordMismatch
	}

	return nil
}

func (s *Service) cachedLoad(ctx context.Context) (entity.Settings, bool, error) {
	now := s.clock.Now()

	s.cacheMu.RLock()
	cached, fresh := s.cache.value, now.Before(s.cache.expiresAt)
	s.cacheMu.RUnlock()

	if fresh {
		return cached, true, nil
	}

	settings, found, err := s.load(ctx)
	if err != nil || !found {
		return settings, found, err
	}

	s.cacheMu.Lock()
	s.cache = cachedSettings{value: settings, expiresAt: now.Add(settingsCacheTTL)}
	s.cacheMu.Unlock()

	return settings, true, nil
}

func (s *Service) load(ctx context.Context) (entity.Settings, bool, error) {
	raw, found, err := s.store.Setting(ctx, constant.SettingAppSettings)
	if err != nil {
		return entity.Settings{}, false, err
	}

	if !found {
		return entity.DefaultSettings(), false, nil
	}

	plain, err := s.sealer.Open(ctx, raw)
	if err != nil {
		return entity.Settings{}, false, fmt.Errorf("open settings: %w", err)
	}

	var settings entity.Settings
	if err := json.Unmarshal(plain, &settings); err != nil {
		return entity.Settings{}, false, fmt.Errorf("decode settings: %w", err)
	}

	return settings, true, nil
}

func (s *Service) save(ctx context.Context, settings entity.Settings) error {
	sealed, err := s.encode(ctx, settings)
	if err != nil {
		return err
	}

	if err := s.store.SetSetting(ctx, constant.SettingAppSettings, sealed); err != nil {
		return fmt.Errorf("store settings: %w", err)
	}

	s.InvalidateCache()

	return nil
}

func (s *Service) create(ctx context.Context, settings entity.Settings) (bool, error) {
	sealed, err := s.encode(ctx, settings)
	if err != nil {
		return false, err
	}

	created, err := s.store.CreateSetting(ctx, constant.SettingAppSettings, sealed)
	if err != nil {
		return false, fmt.Errorf("store settings: %w", err)
	}

	if created {
		s.InvalidateCache()
	}

	return created, nil
}

func (s *Service) encode(ctx context.Context, settings entity.Settings) (string, error) {
	if err := settings.Validate(); err != nil {
		return "", err
	}

	encoded, err := json.Marshal(settings)
	if err != nil {
		return "", fmt.Errorf("encode settings: %w", err)
	}

	sealed, err := s.sealer.Seal(ctx, encoded)
	if err != nil {
		return "", fmt.Errorf("seal settings: %w", err)
	}

	return sealed, nil
}
