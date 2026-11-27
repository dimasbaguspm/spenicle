package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/swaggo/swag/v2"

	httpcmd "github.com/dimasbaguspm/spenicle/cmd/http"
)

// quiet swallows swag's per-type progress log: the generator's output is the document,
// and a run that says nothing changed nothing.
type quiet struct{}

func (quiet) Printf(string, ...any) {}

const (
	specFile    = "openapi.json"
	searchDir   = "."
	mainAPIFile = "tools/openapi/main.go"
	excludes    = "uat,vendor,bin,data,docs"
	schemaRef   = "#/components/schemas/"
	bearer      = "Bearer"
	filePerm    = 0o644
	publicGroup = "public"
)

func run() error {
	check := flag.Bool("check", false, "compare the committed document instead of writing it")

	flag.Parse()

	document, err := render()
	if err != nil {
		return err
	}

	if *check {
		committed, err := os.ReadFile(specFile)
		if err != nil {
			return fmt.Errorf("read %s: %w", specFile, err)
		}

		if !bytes.Equal(committed, document) {
			return fmt.Errorf("%s is stale: run make openapi", specFile)
		}

		return nil
	}

	if err := os.WriteFile(specFile, document, filePerm); err != nil {
		return fmt.Errorf("write %s: %w", specFile, err)
	}

	return nil
}

func render() ([]byte, error) {
	parser := swag.New(
		swag.GenerateOpenAPI3Doc(true),
		swag.SetExcludedDirsAndFiles(excludes),
		swag.SetDebugger(quiet{}),
	)

	if err := parser.ParseAPI(searchDir, mainAPIFile, 0); err != nil {
		return nil, fmt.Errorf("parse annotations: %w", err)
	}

	raw, err := json.Marshal(parser.GetOpenAPI())
	if err != nil {
		return nil, fmt.Errorf("marshal document: %w", err)
	}

	var document map[string]any
	if decodeErr := json.Unmarshal(raw, &document); decodeErr != nil {
		return nil, fmt.Errorf("decode document: %w", decodeErr)
	}

	nameSchemas(document)
	normalizeRefs(document)
	attachAccess(document)

	delete(document, "externalDocs")
	document["servers"] = []any{map[string]any{"url": "/"}}

	encoded, err := json.MarshalIndent(document, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("encode document: %w", err)
	}

	return append(encoded, '\n'), nil
}

// attachAccess stamps the group, the scope and the credential scheme of every
// published operation from the route table, so the document cannot claim an access
// rule the handler does not enforce.
func attachAccess(document map[string]any) {
	components, _ := document["components"].(map[string]any)
	schemes, _ := components["securitySchemes"].(map[string]any)
	schemes[bearer] = map[string]any{
		"type":   "http",
		"scheme": "bearer",
		"description": "The instance password (root: every route) or a scoped token: " +
			"a token answers only the routes whose scope it carries.",
	}

	paths, _ := document["paths"].(map[string]any)

	for _, route := range httpcmd.Routes() {
		methods, _ := paths[route.Path].(map[string]any)

		operation, _ := methods[strings.ToLower(route.Method)].(map[string]any)
		if operation == nil {
			continue
		}

		operation["operationId"] = operationID(route)

		if body, ok := operation["requestBody"].(map[string]any); ok {
			body["required"] = true
		}

		operation["x-spenicle-scope"] = route.Scope
		operation["x-spenicle-group"] = route.Group

		if route.Group == publicGroup {
			operation["security"] = []any{}

			continue
		}

		operation["security"] = []any{map[string]any{bearer: []any{}}}
	}
}

// operationID names an operation after the route it serves: the method, then every
// path segment, with a path parameter read as `ByRef`.
func operationID(route httpcmd.Route) string {
	parts := []string{strings.ToLower(route.Method)}

	for segment := range strings.SplitSeq(strings.Trim(route.Path, "/"), "/") {
		if segment == "" {
			continue
		}

		if name, ok := strings.CutPrefix(segment, "{"); ok {
			parts = append(parts, "By"+strings.ToUpper(name[:1])+name[1:len(name)-1])

			continue
		}

		parts = append(parts, strings.ToUpper(segment[:1])+segment[1:])
	}

	return strings.Join(parts, "")
}

// nameSchemas drops the Go package name swag puts in front of a schema, so the
// generated client reads `entryResponse` and not `handlers.entryResponse`.
func nameSchemas(document map[string]any) {
	components, _ := document["components"].(map[string]any)
	schemas, _ := components["schemas"].(map[string]any)

	renamed := make(map[string]any, len(schemas))

	for name, schema := range schemas {
		renamed[schemaName(name)] = schema
	}

	components["schemas"] = renamed
}

func schemaName(raw string) string {
	if _, after, ok := strings.Cut(raw, "."); ok {
		return after
	}

	return raw
}

// normalizeRefs rewrites every `$ref` to the renamed schema, collapsing the doubled
// prefix swag emits when one annotated struct embeds a type from another package.
func normalizeRefs(value any) {
	switch typed := value.(type) {
	case map[string]any:
		for key, inner := range typed {
			text, isText := inner.(string)
			if key == "$ref" && isText {
				typed[key] = schemaRef + schemaName(strings.TrimPrefix(text, schemaRef))

				continue
			}

			normalizeRefs(inner)
		}
	case []any:
		for _, inner := range typed {
			normalizeRefs(inner)
		}
	}
}
