package validating

import "testing"

func TestAuditLifecycleVocabulary(t *testing.T) {
	cases := []struct {
		name  string
		tag   string
		value string
		want  bool
	}{
		{name: "system kind", tag: "auditkind", value: "system", want: true},
		{name: "start action", tag: "auditaction", value: "start", want: true},
		{name: "unknown kind", tag: "auditkind", value: "process", want: false},
		{name: "unknown action", tag: "auditaction", value: "stop", want: false},
		{name: "a timestamp", tag: "timestamp", value: "2026-04-15T09:00:00Z", want: true},
		{name: "a date is not a timestamp", tag: "timestamp", value: "2026-04-15", want: false},
		{name: "an empty timestamp", tag: "timestamp", value: "", want: false},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			err := Var(testCase.value, testCase.tag)
			if got := err == nil; got != testCase.want {
				t.Fatalf("Var(%q, %q) valid = %t, want %t (%v)",
					testCase.value, testCase.tag, got, testCase.want, err)
			}
		})
	}
}
