// Package uat drives the HTTP contract with Gherkin. Every step speaks HTTP,
// JSON and SQL, never a business rule, so the same vocabulary describes a new
// endpoint without new steps.
//
// This file is the package's public surface: the entry point a runner hands to
// godog. The steps live in steps.go, the per-scenario state in world.go.
package uat

import "github.com/cucumber/godog"

func InitializeScenario(sc *godog.ScenarioContext, options Options) {
	RegisterSteps(sc, options)
}
