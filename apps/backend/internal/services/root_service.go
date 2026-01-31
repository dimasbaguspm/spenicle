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
		Acc:     NewAccountService(repos.Acc, rdb),
		Ath:     NewAuthService(repos.Ath),
		Budg:    NewBudgetService(repos.Budg, rdb),
		BudgTem: NewBudgetTemplateService(repos.BudgTem, repos.Budg, rdb),
		Cat:     NewCategoryService(repos.Cat, rdb),
		Sum:     NewSummaryService(repos.Sum, rdb),
		Tag:     NewTagService(repos.Tag, rdb),
		Tsct:    NewTransactionService(repos.Tsct, repos.Acc, repos.Cat, rdb),
		TsctRel: NewTransactionRelationService(repos.TsctRel, repos.Tsct),
		TsctTag: NewTransactionTagService(repos.TsctTag),
		TsctTem: NewTransactionTemplateService(repos.TsctTem, repos.Tsct, rdb),
	}
}
