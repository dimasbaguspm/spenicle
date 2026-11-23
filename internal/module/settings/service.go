package settings

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository"
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

func (s *Service) EnsureInitial(ctx context.Context, initialPassword string) (entity.Settings, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Settings.EnsureInitial")
	defer endSpan()

	settings, exists, err := s.load(ctx)
	if err != nil {
		return entity.Settings{}, err
	}

	if exists {
		return settings, nil
	}

	settings = entity.DefaultSettings()
	settings.PasswordMustChange = initialPassword != ""
	settings.Password = initialPassword

	if err := s.save(ctx, settings); err != nil {
		return entity.Settings{}, err
	}

	return settings, nil
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

	if settings.Password == "" {
		return settings, false, nil
	}

	if subtle.ConstantTimeCompare([]byte(settings.Password), []byte(password)) != 1 {
		return entity.Settings{}, true, entity.ErrPasswordMismatch
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

	if err := validate.Struct(passwordChange{Current: current, Next: strings.TrimSpace(next)}); err != nil {
		return entity.Settings{}, entity.ErrWeakPassword
	}

	settings.Password = next
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

	sum := sha256.Sum256([]byte("spenicle/session/v1\x00" + s.sealer.Fingerprint()))

	return hex.EncodeToString(sum[:16]), nil
}

func (s *Service) load(ctx context.Context) (entity.Settings, bool, error) {
	raw, found, err := s.store.Setting(ctx, constant.SettingAppSettings)
	if err != nil {
		return entity.Settings{}, false, err
	}

	if !found {
		return s.migrateLegacy(ctx)
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

func (s *Service) migrateLegacy(ctx context.Context) (entity.Settings, bool, error) {
	settings := entity.DefaultSettings()

	legacy, found, err := s.store.Setting(ctx, constant.SettingLegacyBaseCurrency)
	if err != nil {
		return entity.Settings{}, false, err
	}

	if found && legacy != "" {
		settings.BaseCurrency = legacy
	}

	return settings, false, nil
}

func (s *Service) save(ctx context.Context, settings entity.Settings) error {
	if err := settings.Validate(); err != nil {
		return err
	}

	//nolint:gosec // G117: the password is inside this blob, and the very next step seals it
	encoded, err := json.Marshal(settings)
	if err != nil {
		return fmt.Errorf("encode settings: %w", err)
	}

	sealed, err := s.sealer.Seal(ctx, encoded)
	if err != nil {
		return fmt.Errorf("seal settings: %w", err)
	}

	if err := s.store.SetSetting(ctx, constant.SettingAppSettings, sealed); err != nil {
		return fmt.Errorf("store settings: %w", err)
	}

	return nil
}

func IsPasswordMismatch(err error) bool {
	return errors.Is(err, entity.ErrPasswordMismatch)
}
