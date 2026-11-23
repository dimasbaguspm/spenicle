package uat_test

import (
	"testing"

	"github.com/cucumber/godog"

	"github.com/dimasbaguspm/spenicle/uat"
)

// TestFeatures runs every .feature file with the real HTTP handler over a real
// SQLite file. No mocks: a green scenario proves the shipped code.
func TestFeatures(t *testing.T) {
	suite := godog.TestSuite{
		Name:                "spenicle",
		ScenarioInitializer: uat.InitializeScenario,
		Options: &godog.Options{
			Format:   "pretty",
			Paths:    []string{"features"},
			TestingT: t,
			Strict:   true,
		},
	}

	if suite.Run() != 0 {
		t.Fatal("feature suite failed")
	}
}
