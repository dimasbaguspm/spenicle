package repositories

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DBQuerier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

type RootRepository struct {
	Pool    *pgxpool.Pool
	db      DBQuerier
	Acc     AccountRepository
	Ath     AuthRepository
	Budg    BudgetRepository
	BudgTem BudgetTemplateRepository
	Cat     CategoryRepository
	AccStat AccountStatisticsRepository
	CatStat CategoryStatisticsRepository
	Sum     SummaryRepository
	Tag     TagRepository
	Tsct    TransactionRepository
	TsctRel TransactionRelationRepository
	TsctTag TransactionTagRepository
	TsctTem TransactionTemplateRepository
}

func NewRootRepository(ctx context.Context, pgx *pgxpool.Pool) RootRepository {
	db := DBQuerier(pgx)
	return RootRepository{
		Pool:    pgx,
		db:      db,
		Acc:     NewAccountRepository(db),
		Ath:     NewAuthRepository(ctx),
		Budg:    NewBudgetRepository(db),
		BudgTem: NewBudgetTemplateRepository(db),
		Cat:     NewCategoryRepository(db),
		AccStat: NewAccountStatisticsRepository(db),
		CatStat: NewCategoryStatisticsRepository(db),
		Sum:     NewSummaryRepository(db),
		Tag:     NewTagRepository(db),
		Tsct:    NewTransactionRepository(db),
		TsctRel: NewTransactionRelationRepository(db),
		TsctTag: NewTransactionTagRepository(db),
		TsctTem: NewTransactionTemplateRepository(db),
	}
}

func (r RootRepository) WithTx(ctx context.Context, tx pgx.Tx) RootRepository {
	return RootRepository{
		Pool:    r.Pool,
		db:      tx,
		Acc:     NewAccountRepository(tx),
		Ath:     NewAuthRepository(ctx),
		Budg:    NewBudgetRepository(tx),
		BudgTem: NewBudgetTemplateRepository(tx),
		Cat:     NewCategoryRepository(tx),
		AccStat: NewAccountStatisticsRepository(tx),
		CatStat: NewCategoryStatisticsRepository(tx),
		Sum:     NewSummaryRepository(tx),
		Tag:     NewTagRepository(tx),
		Tsct:    NewTransactionRepository(tx),
		TsctRel: NewTransactionRelationRepository(tx),
		TsctTag: NewTransactionTagRepository(tx),
		TsctTem: NewTransactionTemplateRepository(tx),
	}
}
