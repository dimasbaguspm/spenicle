package handlers

import (
	"log/slog"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/module/rates"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

type Deps struct {
	Ledger            ledger.Contract
	Settings          settings.Contract
	Captures          captures.Contract
	Rates             rates.Contract
	Accounts          repository.Accounts
	Payees            repository.Payees
	Recurring         repository.Recurring
	Analytics         repository.Analytics
	CustomQueries     repository.CustomQueries
	Health            repository.System
	Sealer            seal.Sealer
	BaseCurrency      string
	Version           string
	HealthTimeout     time.Duration
	MaxBodyBytes      int64
	WebOrigin         string
	ExtractionEnabled bool
	Logger            *slog.Logger
}
