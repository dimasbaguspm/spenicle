package services

import "github.com/dimasbaguspm/spenicle-api/internal/repositories"

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

func NewRootService(repos repositories.RootRepository) RootService {
	return RootService{
		Acc:     NewAccountService(repos.Acc),
		Ath:     NewAuthService(repos.Ath),
		Budg:    NewBudgetService(repos.Budg),
		BudgTem: NewBudgetTemplateService(repos.BudgTem, repos.Budg),
		Cat:     NewCategoryService(repos.Cat),
		Sum:     NewSummaryService(repos.Sum),
		Tag:     NewTagService(repos.Tag),
		Tsct:    NewTransactionService(repos.Tsct, repos.Acc, repos.Cat),
		TsctRel: NewTransactionRelationService(repos.TsctRel, repos.Tsct),
		TsctTag: NewTransactionTagService(repos.TsctTag),
		TsctTem: NewTransactionTemplateService(repos.TsctTem, repos.Tsct),
	}
}
