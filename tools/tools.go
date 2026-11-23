//go:build tools

// Package tools pins the generators the repository's directives invoke, so
// `go run` and `go generate` use one recorded version per tool.
package tools

import _ "go.uber.org/mock/mockgen"
