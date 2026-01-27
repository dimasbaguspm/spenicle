package configs

import (
	"net/http"

	"github.com/danielgtaylor/huma/v2"
)

func NewOpenApi(svr *http.ServeMux, env Environment) huma.Config {
	config := huma.DefaultConfig("Spenicle API", "1.0.0")

	url := "http://localhost:" + env.AppPort
	desc := "Development server"

	if env.AppStage == AppStageProd {
		url = "/api"
		desc = "Proxied server"
	}

	config.Servers = []*huma.Server{{URL: url, Description: desc}}
	config.CreateHooks = []func(huma.Config) huma.Config{}
	config.Components.SecuritySchemes = map[string]*huma.SecurityScheme{
		"bearer": {Type: "http", Scheme: "bearer", BearerFormat: "JWT"},
	}
	config.DocsPath = ""

	svr.HandleFunc("/docs", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="description" content="SwaggerUI" />
	<title>SwaggerUI</title>
	<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" crossorigin></script>
<script>
	window.onload = () => {
		window.ui = SwaggerUIBundle({
			url: '/openapi.json',
			dom_id: '#swagger-ui',
		});
	};
</script>
</body>
</html>`))
	})

	return config
}
