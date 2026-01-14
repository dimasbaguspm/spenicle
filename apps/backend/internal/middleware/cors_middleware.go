package middleware

import (
	"net/http"
	"strings"

	"github.com/danielgtaylor/huma/v2"
)

var (
	allowedOrigins = []string{"http://localhost:3000"}
	allowedMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	allowedHeaders = []string{"Content-Type", "Authorization"}
)

func CORS(api huma.API) func(huma.Context, func(huma.Context)) {
	return func(ctx huma.Context, next func(huma.Context)) {
		origin := ctx.Header("Origin")

		if ctx.Method() == http.MethodOptions {
			huma.WriteErr(api, ctx, http.StatusNoContent, "Method doesn't allowed")
			return
		}

		ctx.SetHeader("Access-Control-Allow-Methods", strings.Join(allowedMethods, ", "))
		ctx.SetHeader("Access-Control-Allow-Headers", strings.Join(allowedHeaders, ", "))
		ctx.SetHeader("Access-Control-Allow-Credentials", "true")

		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				ctx.SetHeader("Access-Control-Allow-Origin", origin)
				break
			}
		}

		next(ctx)
	}
}
