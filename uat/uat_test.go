package uat_test

import (
	"testing"

	"github.com/cucumber/godog"

	"github.com/dimasbaguspm/spenicle/uat"
)

func TestFeatures(t *testing.T) {
	suite := godog.TestSuite{
		Name: "spenicle",
		ScenarioInitializer: func(sc *godog.ScenarioContext) {
			uat.InitializeScenario(sc, uat.Options{RatesEndpoint: ratesEndpoint()})
		},
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
