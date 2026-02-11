package services

import (
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
)

type RootService struct {
	Acc     AccountService
	AccStat AccountStatisticsService
	Ath     AuthService
	BudgTem BudgetTemplateService
	Cat     CategoryService
	CatStat CategoryStatisticsService
	Pref    PreferenceService
	Sum     SummaryService
	Tag     TagService
	Tsct    TransactionService
	TsctRel TransactionRelationService
	TsctTag TransactionTagService
	TsctTem TransactionTemplateService
}

func NewRootService(repos repositories.RootRepository, rdb *redis.Client) RootService {
	tsctService := NewTransactionService(&repos, rdb)
	return RootService{
		Acc:     NewAccountService(&repos, rdb),
		AccStat: NewAccountStatisticsService(&repos, rdb),
		Ath:     NewAuthService(&repos),
		BudgTem: NewBudgetTemplateService(&repos, rdb),
		Cat:     NewCategoryService(&repos, rdb),
		CatStat: NewCategoryStatisticsService(&repos, rdb),
		Pref:    NewPreferenceService(&repos, tsctService.GetGeoIndexManager()),
		Sum:     NewSummaryService(&repos, rdb),
		Tag:     NewTagService(&repos, rdb),
		Tsct:    tsctService,
		TsctRel: NewTransactionRelationService(&repos, rdb),
		TsctTag: NewTransactionTagService(&repos, rdb),
		TsctTem: NewTransactionTemplateService(&repos, rdb),
	}
}
