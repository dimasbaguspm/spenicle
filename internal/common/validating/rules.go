package validating

import (
	"strings"
	"unicode/utf8"

	"github.com/go-playground/validator/v10"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const (
	refLength        = 32
	tagCurrency      = "currency"
	tagCaptureAction = "captureaction"
)

var rules = map[string]validator.Func{ //nolint:gochecknoglobals // read-only rule table
	tagCurrency: func(field validator.FieldLevel) bool {
		_, err := entity.CurrencyByCode(field.Field().String())

		return err == nil
	},
	tagCaptureAction: func(field validator.FieldLevel) bool {
		switch field.Field().String() {
		case "approve", "reject", "retry", "match":
			return true
		default:
			return false
		}
	},
	"money": func(field validator.FieldLevel) bool {
		_, err := Money(field.Field().String(), "money")

		return err == nil
	},
	"datestr": func(field validator.FieldLevel) bool {
		raw := strings.TrimSpace(field.Field().String())
		if raw == "" {
			return false
		}

		_, err := Day(raw, "date")

		return err == nil
	},
	"rate": func(field validator.FieldLevel) bool {
		_, err := entity.ParseRate(field.Field().String())

		return err == nil
	},
	"capturekind":     validCaptureKind,
	"source":          validEntrySource,
	"sourcelist":      validSourceList,
	"ref":             validRef,
	"reflist":         validRefList,
	"accountkind":     validAccountKind,
	"cadence":         validCadence,
	"importstatus":    validImportStatus,
	"importrowstatus": validImportRowStatus,
	"recurringstate":  validRecurringState,
	"shift":           validShift,
	"capturestatus":   validCaptureStatus,
	"exportstatus":    validExportStatus,
	"scope":           validScope,
	"auditkind":       validAuditKind,
	"auditaction":     validAuditAction,
	"rulefield":       validRuleField,
	"rulematch":       validRuleMatch,
	"rulepattern":     validRulePattern,
	"auditactor":      validAuditActor,
}

func validRef(field validator.FieldLevel) bool {
	raw := strings.TrimSpace(field.Field().String())

	return raw == "" || isRef(raw)
}

func validRefList(field validator.FieldLevel) bool {
	for _, part := range splitList(field.Field().String()) {
		if !isRef(part) {
			return false
		}
	}

	return true
}

func isRef(raw string) bool {
	if len(raw) != refLength {
		return false
	}

	for _, char := range raw {
		if (char < '0' || char > '9') && (char < 'a' || char > 'f') {
			return false
		}
	}

	return true
}

func validAccountKind(field validator.FieldLevel) bool {
	switch field.Field().String() {
	case constant.AccountKindAsset, constant.AccountKindLiability,
		constant.AccountKindEquity, constant.AccountKindExpense, constant.AccountKindIncome:
		return true
	default:
		return false
	}
}

func validCadence(field validator.FieldLevel) bool {
	switch field.Field().String() {
	case constant.RecurringCadenceDaily, constant.RecurringCadenceWeekly,
		constant.RecurringCadenceMonthly, constant.RecurringCadenceYearly:
		return true
	default:
		return false
	}
}

func validRecurringState(field validator.FieldLevel) bool {
	switch field.Field().String() {
	case constant.RecurringStateSuggested, constant.RecurringStateActive,
		constant.RecurringStatePaused, constant.RecurringStateEnded:
		return true
	default:
		return false
	}
}

func validShift(field validator.FieldLevel) bool {
	switch field.Field().String() {
	case constant.ShiftNone, constant.ShiftNext, constant.ShiftPrev:
		return true
	default:
		return false
	}
}

func validImportStatus(field validator.FieldLevel) bool {
	switch field.Field().String() {
	case constant.ImportStatusDraft, constant.ImportStatusCommitted, constant.ImportStatusRejected:
		return true
	default:
		return false
	}
}

func validImportRowStatus(field validator.FieldLevel) bool {
	switch field.Field().String() {
	case constant.ImportRowStatusAccepted, constant.ImportRowStatusSkipped:
		return true
	default:
		return false
	}
}

func validCaptureKind(field validator.FieldLevel) bool {
	switch field.Field().String() {
	case constant.CaptureKindShare, constant.CaptureKindImage,
		constant.CaptureKindEmail, constant.CaptureKindStatement,
		constant.CaptureKindRecurring, constant.CaptureKindManual:
		return true
	default:
		return false
	}
}

func validEntrySource(field validator.FieldLevel) bool {
	return isEntrySource(field.Field().String())
}

func validSourceList(field validator.FieldLevel) bool {
	for _, part := range splitList(field.Field().String()) {
		if !isEntrySource(part) {
			return false
		}
	}

	return true
}

func isEntrySource(value string) bool {
	switch value {
	case constant.EntrySourceManual, constant.EntrySourceShare, constant.EntrySourceEmail,
		constant.EntrySourceStatement, constant.EntrySourceRecurring,
		constant.EntrySourceAdjustment:
		return true
	default:
		return false
	}
}

func splitList(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))

	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}

	return out
}

func validCaptureStatus(field validator.FieldLevel) bool {
	switch field.Field().String() {
	case constant.CaptureStatusExtracting, constant.CaptureStatusPending,
		constant.CaptureStatusDuplicate, constant.CaptureStatusApproved,
		constant.CaptureStatusRejected, constant.CaptureStatusFailed:
		return true
	default:
		return false
	}
}

func validExportStatus(field validator.FieldLevel) bool {
	switch field.Field().String() {
	case constant.ExportStatusQueued, constant.ExportStatusRunning, constant.ExportStatusReady,
		constant.ExportStatusFailed, constant.ExportStatusExpired:
		return true
	default:
		return false
	}
}

func validScope(field validator.FieldLevel) bool {
	return entity.KnownScope(field.Field().String())
}

func validAuditKind(field validator.FieldLevel) bool {
	switch field.Field().String() {
	case constant.AuditEntitySetting, constant.AuditEntityAccount, constant.AuditEntityPayee,
		constant.AuditEntityRecurring, constant.AuditEntityEntry, constant.AuditEntityCapture,
		constant.AuditEntityToken, constant.AuditEntityCategorizationRule:
		return true
	default:
		return false
	}
}

func validAuditAction(field validator.FieldLevel) bool {
	switch field.Field().String() {
	case constant.AuditActionCreate, constant.AuditActionUpdate, constant.AuditActionVoid,
		constant.AuditActionApprove, constant.AuditActionReject, constant.AuditActionRetry,
		constant.AuditActionGenerate, constant.AuditActionAdvance, constant.AuditActionRevoke:
		return true
	default:
		return false
	}
}

func validAuditActor(field validator.FieldLevel) bool {
	switch field.Field().String() {
	case constant.AuditActorUser, constant.AuditActorWorker, constant.AuditActorSystem:
		return true
	default:
		return false
	}
}

func validRuleField(field validator.FieldLevel) bool {
	switch field.Field().String() {
	case constant.RuleFieldPayee, constant.RuleFieldNote:
		return true
	default:
		return false
	}
}

func validRuleMatch(field validator.FieldLevel) bool {
	switch field.Field().String() {
	case constant.RuleMatchExact, constant.RuleMatchContains, constant.RuleMatchPrefix:
		return true
	default:
		return false
	}
}

func validRulePattern(field validator.FieldLevel) bool {
	length := utf8.RuneCountInString(strings.TrimSpace(field.Field().String()))

	return length >= constant.RulePatternMinLength && length <= constant.RulePatternMaxLength
}
