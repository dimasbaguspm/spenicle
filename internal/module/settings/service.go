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
	"errors"
	"fmt"
	"strconv"
	"strings"
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
)

var validate = validator.New() //nolint:gochecknoglobals // one registry, built once

type passwordChange struct {
	Current string `validate:"required"`
	Next    string `validate:"required,min=12,max=200"`
}

type Service struct {
	store  repository.System
	sealer seal.Sealer
	clock  TimeSource
}

type TimeSource interface{ Now() time.Time }

func New(store repository.System, sealer seal.Sealer, clock TimeSource) *Service {
	return &Service{store: store, sealer: sealer, clock: clock}
}

var _ Contract = (*Service)(nil)

func (s *Service) Load(ctx context.Context) (entity.Settings, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Settings.Load")
	defer endSpan()

	settings, _, err := s.load(ctx)

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
	initialPassword string,
) (entity.Settings, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Settings.EnsureInitial")
	defer endSpan()

	settings, exists, err := s.load(ctx)
	if err != nil {
		return entity.Settings{}, false, err
	}

	if exists {
		return settings, false, nil
	}

	settings = entity.DefaultSettings()

	if initialPassword != "" {
		encoded, hashErr := hashPassword(initialPassword)
		if hashErr != nil {
			return entity.Settings{}, false, hashErr
		}

		settings.PasswordHash = encoded
		settings.PasswordMustChange = true
	}

	created, err := s.create(ctx, settings)
	if err != nil {
		return entity.Settings{}, false, err
	}

	if !created {
		stored, _, loadErr := s.load(ctx)
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
	settings.PasswordMustChange = false

	if err := s.save(ctx, settings); err != nil {
		return entity.Settings{}, err
	}

	return settings, nil
}

func (s *Service) SetBaseCurrency(ctx context.Context, code string) (entity.Settings, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Settings.SetBaseCurrency")
	defer endSpan()

	normalised := strings.ToUpper(strings.TrimSpace(code))
	if _, err := entity.CurrencyByCode(normalised); err != nil {
		return entity.Settings{}, err
	}

	hasEntries, err := s.store.HasEntries(ctx)
	if err != nil {
		return entity.Settings{}, err
	}

	if hasEntries {
		return entity.Settings{}, entity.ErrBaseCurrencyLocked
	}

	settings, err := s.Load(ctx)
	if err != nil {
		return entity.Settings{}, err
	}

	settings.BaseCurrency = normalised

	if err := s.save(ctx, settings); err != nil {
		return entity.Settings{}, err
	}

	return settings, nil
}

func (s *Service) SessionToken(ctx context.Context) (string, error) {
	_, endSpan := telemetry.StartSpan(ctx, "Module.Settings.SessionToken")
	defer endSpan()

	settings, _, err := s.load(ctx)
	if err != nil {
		return "", err
	}

	sum := sha256.Sum256([]byte(strings.Join(
		[]string{"spenicle/session/v2", s.sealer.Fingerprint(), settings.PasswordHash}, "\x00",
	)))

	return hex.EncodeToString(sum[:16]), nil
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

func IsPasswordMismatch(err error) bool {
	return errors.Is(err, entity.ErrPasswordMismatch)
}
