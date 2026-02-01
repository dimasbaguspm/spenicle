package resources

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/seed"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type SeedResource struct {
	db  *pgxpool.Pool
	rdb *redis.Client
}

func NewSeedResource(db *pgxpool.Pool, rdb *redis.Client) SeedResource {
	return SeedResource{db, rdb}
}

type SeedDevelopmentDataRequest struct{}

type SeedDevelopmentDataResponse struct {
	Body struct {
		Message string `json:"message" doc:"Response message"`
	}
}

func (sr SeedResource) SeedDevelopmentData(ctx context.Context, req *SeedDevelopmentDataRequest) (*SeedDevelopmentDataResponse, error) {
	if err := seed.SeedDevelopmentData(ctx, sr.db, sr.rdb); err != nil {
		return nil, huma.Error400BadRequest("Failed to seed development data", err)
	}

	return &SeedDevelopmentDataResponse{
		Body: struct {
			Message string `json:"message" doc:"Response message"`
		}{
			Message: "Development data seeded successfully",
		},
	}, nil
}

func (sr SeedResource) Routes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "seed-development-data",
		Method:      "POST",
		Path:        "/seed/development",
		Summary:     "Seed development data",
		Description: "Seed the database with development data.",
		Tags:        []string{"Development"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, sr.SeedDevelopmentData)
}
