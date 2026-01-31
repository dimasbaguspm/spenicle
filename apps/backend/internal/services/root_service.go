package services

import (
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
)

type RootService struct {
	Acc     AccountService
	Ath     AuthService
	Budg    BudgetService
	BudgTem BudgetTemplateService
	Cat     CategoryService
	Sum     SummaryService
	Tag     TagService
	Tsct    TransactionService
	TsctRel TransactionRelationService
	TsctTag TransactionTagService
	TsctTem TransactionTemplateService
}

func NewRootService(repos repositories.RootRepository, rdb *redis.Client) RootService {
	return RootService{
		Acc:     NewAccountService(&repos, rdb),
		Ath:     NewAuthService(&repos),
		Budg:    NewBudgetService(&repos, rdb),
		BudgTem: NewBudgetTemplateService(&repos, rdb),
		Cat:     NewCategoryService(&repos, rdb),
		Sum:     NewSummaryService(&repos, rdb),
		Tag:     NewTagService(&repos, rdb),
		Tsct:    NewTransactionService(&repos, rdb),
		TsctRel: NewTransactionRelationService(&repos, rdb),
		TsctTag: NewTransactionTagService(&repos, rdb),
		TsctTem: NewTransactionTemplateService(&repos, rdb),
	}
}
