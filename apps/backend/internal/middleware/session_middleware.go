package middleware

import (
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

func SessionMiddleware(api huma.API) func(huma.Context, func(huma.Context)) {
	return func(ctx huma.Context, next func(huma.Context)) {
		logger := observability.GetLogger(ctx.Context())

		ar := repositories.NewAuthRepository(ctx.Context())

		atk := ctx.Header("Authorization")
		if len(atk) > 7 && atk[:7] == "Bearer " {
			atk = atk[7:]
		}

		_, err := ar.ParseToken(atk)
		if err != nil {
			logger.Error("auth_failed", "error", err, "status", http.StatusUnauthorized)
			huma.WriteErr(api, ctx, http.StatusUnauthorized, "Invalid or missed auth token")
			return
		}

		logger.Info("auth_granted")
		next(ctx)
	}
}
