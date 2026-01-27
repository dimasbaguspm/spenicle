package repositories

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type RootRepository struct {
	Acc     AccountRepository
	Ath     AuthRepository
	Budg    BudgetRepository
	BudgTem BudgetTemplateRepository
	Cat     CategoryRepository
	Sum     SummaryRepository
	Tag     TagRepository
	Tsct    TransactionRepository
	TsctRel TransactionRelationRepository
	TsctTag TransactionTagRepository
	TsctTem TransactionTemplateRepository
}

func NewRootRepository(ctx context.Context, pgx *pgxpool.Pool) RootRepository {
	return RootRepository{
		Acc:     NewAccountRepository(pgx),
		Ath:     NewAuthRepository(ctx),
		Budg:    NewBudgetRepository(pgx),
		BudgTem: NewBudgetTemplateRepository(pgx),
		Cat:     NewCategoryRepository(pgx),
		Sum:     NewSummaryRepository(pgx),
		Tag:     NewTagRepository(pgx),
		Tsct:    NewTransactionRepository(pgx),
		TsctRel: NewTransactionRelationRepository(pgx),
		TsctTag: NewTransactionTagRepository(pgx),
		TsctTem: NewTransactionTemplateRepository(pgx),
	}
}
