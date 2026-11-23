package handlers

import (
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func TestCapabilitiesAreIndependent(t *testing.T) {
	cases := []struct {
		name       string
		extraction bool
		ai         bool
	}{
		{name: "neither rail is configured"},
		{name: "only the SnapToJSON rail", extraction: true},
		{name: "only the OpenAI rail", ai: true},
		{name: "both rails", extraction: true, ai: true},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			appSettings := entity.Settings{BaseCurrency: "IDR", Timezone: "UTC"}

			payload := toSettingsResponse(appSettings, testCase.extraction, testCase.ai)
			if payload.ExtractionEnabled != testCase.extraction {
				t.Fatalf("extraction_enabled = %v, want %v", payload.ExtractionEnabled, testCase.extraction)
			}

			if payload.AIAssistance != testCase.ai {
				t.Fatalf("ai_assistance = %v, want %v", payload.AIAssistance, testCase.ai)
			}

			if payload.Timezone != "UTC" {
				t.Fatalf("timezone = %q, want the stored value", payload.Timezone)
			}

			block := metaSettings(appSettings, testCase.extraction, testCase.ai)
			if block["extraction_enabled"] != testCase.extraction {
				t.Fatalf("meta extraction_enabled = %v, want %v", block["extraction_enabled"], testCase.extraction)
			}

			if block["ai_assistance"] != testCase.ai {
				t.Fatalf("meta ai_assistance = %v, want %v", block["ai_assistance"], testCase.ai)
			}
		})
	}
}
