package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	httpcmd "github.com/dimasbaguspm/spenicle/cmd/http"
)

func TestSpecIsCurrent(t *testing.T) {
	chdirRoot(t)

	document, err := render()
	if err != nil {
		t.Fatalf("render: %v", err)
	}

	committed, err := os.ReadFile(specFile)
	if err != nil {
		t.Fatalf("read %s: %v", specFile, err)
	}

	if !bytes.Equal(committed, document) {
		t.Fatal("openapi.json is stale: run make openapi")
	}
}

func TestSpecMatchesRoutes(t *testing.T) {
	chdirRoot(t)

	served := make(map[string]struct{})

	for _, route := range httpcmd.Routes() {
		served[strings.ToLower(route.Method)+" "+route.Path] = struct{}{}
	}

	published := publishedOperations(t)

	for operation := range published {
		if _, ok := served[operation]; !ok {
			t.Errorf("openapi.json publishes %q, which no route serves", operation)
		}
	}

	for operation := range served {
		if _, ok := published[operation]; !ok {
			t.Errorf("%q is served but publishes no operation", operation)
		}
	}
}

func publishedOperations(t *testing.T) map[string]struct{} {
	t.Helper()

	document := publishedDocument(t)

	paths, ok := document["paths"].(map[string]any)
	if !ok {
		t.Fatal("openapi.json has no paths")
	}

	operations := make(map[string]struct{})

	for path, methods := range paths {
		entries, _ := methods.(map[string]any)

		for method := range entries {
			operations[method+" "+path] = struct{}{}
		}
	}

	return operations
}

func publishedDocument(t *testing.T) map[string]any {
	t.Helper()

	raw, err := os.ReadFile(specFile)
	if err != nil {
		t.Fatalf("read %s: %v", specFile, err)
	}

	var document map[string]any
	if err := json.Unmarshal(raw, &document); err != nil {
		t.Fatalf("decode %s: %v", specFile, err)
	}

	return document
}

func chdirRoot(t *testing.T) {
	t.Helper()

	t.Chdir(filepath.Join("..", ".."))
}
