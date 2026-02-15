package services

import (
	"context"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
)

type ConfigService struct {
	repo *repositories.RootRepository
	rdb  *redis.Client
}

func NewConfigService(repo *repositories.RootRepository, rdb *redis.Client) ConfigService {
	return ConfigService{
		repo: repo,
		rdb:  rdb,
	}
}

// GetBaseCurrency retrieves the configured base currency for the application (cached)
func (cs ConfigService) GetBaseCurrency(ctx context.Context) (string, error) {
	cacheKey := common.BuildConfigCacheKey("baseCurrency")

	return common.FetchWithCache(
		ctx, cs.rdb, cacheKey, 24*time.Hour,
		func(ctx context.Context) (string, error) {
			return cs.repo.CurConfig.GetBaseCurrency(ctx)
		},
		"config",
	)
}
