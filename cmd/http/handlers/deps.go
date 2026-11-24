package handlers

import (
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/logging"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/module/categorization"
	"github.com/dimasbaguspm/spenicle/internal/module/connections"
	"github.com/dimasbaguspm/spenicle/internal/module/exports"
	"github.com/dimasbaguspm/spenicle/internal/module/imports"
	"github.com/dimasbaguspm/spenicle/internal/module/intake"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/module/rates"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/module/tokens"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

type Deps struct {
	Ledger            ledger.Contract
	Settings          settings.Contract
	Imports           imports.Contract
	Captures          captures.Contract
	Rates             rates.Contract
	Accounts          repository.Accounts
	Payees            repository.Payees
	Recurring         repository.Recurring
	Rules             repository.Categorization
	Categorization    categorization.Contract
	Analytics         repository.Analytics
	CustomQueries     repository.CustomQueries
	Artifacts         repository.Artifacts
	Health            repository.System
	Audit             repository.Audit
	Tokens            tokens.Contract
	Connections       connections.Contract
	Intake            intake.Contract
	ArtifactFiles     repository.ArtifactFiles
	ExportFiles       repository.ArtifactFiles
	Exports           exports.Contract
	Sealer            seal.Sealer
	BaseCurrency      string
	Timezone          string
	Version           string
	HealthTimeout     time.Duration
	MaxBodyBytes      int64
	MaxArtifactBytes  int64
	ImportMaxBytes    int64
	ExtractionEnabled bool
	AIAssistance      bool
	Logger            *logging.Logger
}
