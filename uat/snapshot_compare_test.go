package uat_test

import (
	"testing"

	"github.com/dimasbaguspm/spenicle/uat"
)

func TestNormaliseString(t *testing.T) {
	tests := []struct {
		name  string
		value string
		want  string
	}{
		{
			name:  "timestamp",
			value: "2026-02-14T12:34:56Z",
			want:  "<timestamp>",
		},
		{
			name:  "timestamp with fraction",
			value: "2026-02-14T12:34:56.123Z",
			want:  "<timestamp>",
		},
		{
			name:  "timestamp inside audit payload",
			value: `{"archived_at":"2026-02-14T12:34:56Z"}`,
			want:  `{"archived_at":"<timestamp>"}`,
		},
		{
			name:  "calendar date stays exact",
			value: "2026-02-14",
			want:  "2026-02-14",
		},
		{
			name:  "ordinary text",
			value: "Opening balance",
			want:  "Opening balance",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := uat.NormaliseStringForTest(tc.value); got != tc.want {
				t.Fatalf("normaliseString(%q) = %q, want %q", tc.value, got, tc.want)
			}
		})
	}
}
