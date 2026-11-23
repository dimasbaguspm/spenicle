package bdd

import (
	"testing"

	"github.com/cucumber/godog"
)

// TestFeatures runs every .feature file with the real HTTP handler over a real
// SQLite file. No mocks: a green scenario proves the shipped code.
func TestFeatures(t *testing.T) {
	suite := godog.TestSuite{
		Name:                "spenicle",
		ScenarioInitializer: InitializeScenario,
		Options: &godog.Options{
			Format:   "pretty",
			Paths:    []string{"../../features"},
			TestingT: t,
			Strict:   true,
		},
	}

	if suite.Run() != 0 {
		t.Fatal("feature suite failed")
	}
}

// InitializeScenario registers the shared vocabulary so other suites (or a
// standalone godog binary) can reuse it unchanged.
func InitializeScenario(sc *godog.ScenarioContext) {
	RegisterSteps(sc)
}
