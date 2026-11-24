package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const (
	testBaseCurrency = "IDR"
	testTimezone     = "Asia/Jakarta"
)

func TestEverySettingsPayloadCarriesTheBaseCurrencyAndTheTimezone(t *testing.T) {
	appSettings := entity.Settings{BaseCurrency: testBaseCurrency, Timezone: testTimezone}

	cases := []struct {
		name    string
		payload any
	}{
		{
			name:    "GET /api/settings",
			payload: toSettingsResponse(appSettings, false, false),
		},
		{
			name:    "POST /api/setup and POST /api/password",
			payload: toSettingsResponse(appSettings, false, false),
		},
		{
			name:    "GET /api/meta settings block",
			payload: metaSettings(appSettings, false, false),
		},
		{
			name: "/healthz",
			payload: healthResponse{
				Status:       "ok",
				BaseCurrency: appSettings.BaseCurrency,
				Timezone:     appSettings.Timezone,
			},
		},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			body, err := json.Marshal(testCase.payload)
			if err != nil {
				t.Fatalf("encode payload: %v", err)
			}

			var fields map[string]any
			if decodeErr := json.Unmarshal(body, &fields); decodeErr != nil {
				t.Fatalf("decode payload: %v", decodeErr)
			}

			if fields["base_currency"] != testBaseCurrency {
				t.Fatalf("base_currency = %v, want %q in %s", fields["base_currency"], testBaseCurrency, body)
			}

			if fields["timezone"] != testTimezone {
				t.Fatalf("timezone = %v, want %q in %s", fields["timezone"], testTimezone, body)
			}
		})
	}
}

func TestPatchSettingsRefusesTheBaseCurrency(t *testing.T) {
	cases := []struct {
		name   string
		body   string
		status int
		code   string
	}{
		{
			name:   "the base currency is not patchable",
			body:   `{"base_currency":"USD"}`,
			status: http.StatusBadRequest,
			code:   "invalid_json",
		},
		{
			name:   "the timezone is not patchable either",
			body:   `{"timezone":"America/New_York"}`,
			status: http.StatusBadRequest,
			code:   "invalid_json",
		},
		{
			name:   "an empty body has nothing to change",
			body:   `{}`,
			status: http.StatusUnprocessableEntity,
			code:   "empty_patch",
		},
	}

	server := New(Deps{MaxBodyBytes: 1 << 20})

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPatch, "/api/settings", strings.NewReader(testCase.body))
			recorder := httptest.NewRecorder()

			server.PatchSettings(recorder, request)

			if recorder.Code != testCase.status {
				t.Fatalf("status = %d, want %d", recorder.Code, testCase.status)
			}

			var answer struct {
				Error struct {
					Code string `json:"code"`
				} `json:"error"`
			}

			if err := json.Unmarshal(recorder.Body.Bytes(), &answer); err != nil {
				t.Fatalf("decode answer: %v", err)
			}

			if answer.Error.Code != testCase.code {
				t.Fatalf("code = %q, want %q", answer.Error.Code, testCase.code)
			}
		})
	}
}
