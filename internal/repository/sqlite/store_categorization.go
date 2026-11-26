package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/uuid"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const ruleColumns = `r.id, r.ref, r.pattern, r.field, r.match_kind,
	COALESCE(a.ref, ''), a.kind, r.priority, r.archived_at, r.created_at`

const ruleJoins = `JOIN accounts a ON a.id = r.account_id`

const ruleFrom = `FROM categorization_rules r ` + ruleJoins

func (s *Store) CreateRule(
	ctx context.Context,
	rule entity.CategorizationRule,
) (entity.CategorizationRule, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CreateRule")
	defer endSpan()

	accountID, err := s.accountID(ctx, rule.AccountRef)
	if err != nil {
		return entity.CategorizationRule{}, err
	}

	rule.Pattern = normalizePattern(rule.Pattern)
	rule.Ref = uuid.New()
	rule.CreatedAt = time.Now().UTC()

	err = s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		res, execErr := tx.ExecContext(ctx, `
			INSERT INTO categorization_rules
				(ref, pattern, field, match_kind, account_id, priority, archived_at, created_at)
			VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
			rule.Ref,
			rule.Pattern,
			rule.Field,
			rule.MatchKind,
			accountID,
			rule.Priority,
			rule.CreatedAt.Format(constant.TimestampLayout),
		)
		if execErr != nil {
			return fmt.Errorf("create rule %q: %w", rule.Pattern, uniqueViolation(execErr))
		}

		inserted, idErr := res.LastInsertId()
		if idErr != nil {
			return fmt.Errorf("rule id: %w", idErr)
		}

		rule.ID = inserted

		return appendAudit(ctx, tx, auditRecord{
			Kind:   constant.AuditEntityCategorizationRule,
			ID:     rule.ID,
			Ref:    rule.Ref,
			Action: constant.AuditActionCreate,
			To:     rulePayload(rule),
		})
	})
	if err != nil {
		return entity.CategorizationRule{}, err
	}

	return rule, nil
}

func (s *Store) RuleByRef(
	ctx context.Context,
	ref string,
) (entity.CategorizationRule, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.RuleByRef")
	defer endSpan()

	row := s.db.QueryRowContext(ctx,
		`SELECT `+ruleColumns+` `+ruleFrom+` WHERE r.ref = ?`, ref)

	rule, err := scanRuleRow(row)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.CategorizationRule{}, false, nil
	}

	if err != nil {
		return entity.CategorizationRule{}, false, fmt.Errorf("rule %q: %w", ref, err)
	}

	return rule, true, nil
}

func (s *Store) ListRules(
	ctx context.Context,
	filter entity.CategorizationFilter,
) ([]entity.CategorizationRule, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListRules")
	defer endSpan()

	limit := clampLimit(filter.Limit)

	builder := newList("categorization_rules r", ruleColumns)
	builder.join(ruleJoins)
	builder.parentRef("r.account_id", "accounts", filter.AccountRef)

	if !filter.IncludeArchived {
		builder.null("r.archived_at", false)
	}

	builder.after("r.id", "id", "categorization_rules", filter.Cursor)
	builder.orderBy("r.id")

	return pageScan(ctx, s.db, "categorization rules", builder, limit, scanRuleRow)
}

func (s *Store) UpdateRule(
	ctx context.Context,
	rule entity.CategorizationRule,
) (entity.CategorizationRule, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.UpdateRule")
	defer endSpan()

	accountID, err := s.accountID(ctx, rule.AccountRef)
	if err != nil {
		return entity.CategorizationRule{}, err
	}

	rule.Pattern = normalizePattern(rule.Pattern)

	err = s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		if _, execErr := tx.ExecContext(ctx, `
			UPDATE categorization_rules
			SET pattern = ?, account_id = ?, priority = ?, archived_at = ?
			WHERE ref = ?`,
			rule.Pattern,
			accountID,
			rule.Priority,
			nullTime(rule.ArchivedAt),
			rule.Ref,
		); execErr != nil {
			return fmt.Errorf("update rule %q: %w", rule.Ref, uniqueViolation(execErr))
		}

		return appendAudit(ctx, tx, auditRecord{
			Kind:   constant.AuditEntityCategorizationRule,
			ID:     rule.ID,
			Ref:    rule.Ref,
			Action: constant.AuditActionUpdate,
			To:     rulePayload(rule),
		})
	})
	if err != nil {
		return entity.CategorizationRule{}, err
	}

	return rule, nil
}

func (s *Store) ListLiveRules(ctx context.Context) ([]entity.CategorizationRule, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListLiveRules")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx, `SELECT `+ruleColumns+` `+ruleFrom+`
		WHERE r.archived_at IS NULL AND a.archived_at IS NULL
		ORDER BY r.priority DESC, r.id`)
	if err != nil {
		return nil, fmt.Errorf("select live rules: %w", err)
	}

	defer func() { _ = rows.Close() }()

	var out []entity.CategorizationRule

	for rows.Next() {
		rule, scanErr := scanRuleRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}

		out = append(out, rule)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate live rules: %w", err)
	}

	return out, nil
}

func rulePayload(rule entity.CategorizationRule) entity.RuleChanged {
	return entity.RuleChanged{
		Pattern:     rule.Pattern,
		Field:       rule.Field,
		MatchKind:   rule.MatchKind,
		CategoryRef: rule.AccountRef,
		Priority:    rule.Priority,
		ArchivedAt:  auditTime(rule.ArchivedAt),
	}
}

func normalizePattern(pattern string) string {
	return strings.ToLower(strings.TrimSpace(pattern))
}

func scanRuleRow(scanner interface{ Scan(dest ...any) error }) (entity.CategorizationRule, error) {
	var (
		rule       entity.CategorizationRule
		archivedAt sql.NullString
		createdRaw string
	)

	if err := scanner.Scan(&rule.ID, &rule.Ref, &rule.Pattern, &rule.Field, &rule.MatchKind,
		&rule.AccountRef, &rule.AccountKind, &rule.Priority, &archivedAt, &createdRaw); err != nil {
		return entity.CategorizationRule{}, err
	}

	if archivedAt.Valid {
		at, err := time.Parse(constant.TimestampLayout, archivedAt.String)
		if err != nil {
			return entity.CategorizationRule{}, fmt.Errorf("archived_at %q: %w", archivedAt.String, err)
		}

		rule.ArchivedAt = &at
	}

	createdAt, err := time.Parse(constant.TimestampLayout, createdRaw)
	if err != nil {
		return entity.CategorizationRule{}, fmt.Errorf("created_at %q: %w", createdRaw, err)
	}

	rule.CreatedAt = createdAt

	return rule, nil
}
