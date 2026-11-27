package uat

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

func walkContract(path string, value any) error {
	switch typed := value.(type) {
	case map[string]any:
		for key, inner := range typed {
			if err := checkKey(path, key, inner); err != nil {
				return err
			}

			if err := walkContract(path+"."+key, inner); err != nil {
				return err
			}
		}
	case []any:
		for index, inner := range typed {
			if err := walkContract(fmt.Sprintf("%s[%d]", path, index), inner); err != nil {
				return err
			}
		}
	}

	return nil
}

func checkKey(path, key string, value any) error {
	if key == "id" {
		return fmt.Errorf("%s: integer ids never leave the database", path)
	}

	if isOurRef(key) {
		ref, ok := value.(string)
		if !ok || !refPattern.MatchString(ref) {
			return fmt.Errorf("%s.%s is %v, want a 32-hex ref", path, key, value)
		}
	}

	if strings.HasSuffix(key, "_minor") || key == "rate" {
		if _, ok := value.(string); !ok {
			return fmt.Errorf("%s.%s is %v, want a string of minor units", path, key, value)
		}
	}

	return nil
}

const foreignJobRef = "job_ref"

func isOurRef(key string) bool {
	return (key == "ref" || strings.HasSuffix(key, "_ref")) && key != foreignJobRef
}

func compareSnapshot(path string, actual any) error {
	var buffer bytes.Buffer

	encoder := json.NewEncoder(&buffer)
	encoder.SetEscapeHTML(false)
	encoder.SetIndent("", "  ")

	if err := encoder.Encode(actual); err != nil {
		return fmt.Errorf("encode snapshot: %w", err)
	}

	rendered := buffer.Bytes()

	expected, readErr := os.ReadFile(path)
	if readErr == nil && !updatingSnapshots() {
		if bytes.Equal(expected, rendered) {
			return nil
		}

		return fmt.Errorf("snapshot %s differs\n--- want\n%s\n--- got\n%s", path, expected, rendered)
	}

	if readErr != nil && !os.IsNotExist(readErr) {
		return fmt.Errorf("read snapshot %s: %w", path, readErr)
	}

	if err := os.MkdirAll(filepath.Dir(path), snapshotDirPerm); err != nil {
		return fmt.Errorf("create snapshot dir: %w", err)
	}

	//nolint:forbidigo // golden files are repository content, not DATA_DIR artifacts
	if err := os.WriteFile(path, rendered, 0o600); err != nil {
		return fmt.Errorf("write snapshot %s: %w", path, err)
	}

	if readErr != nil && !updatingSnapshots() {
		return fmt.Errorf("snapshot %s did not exist and was written; review it and re-run", path)
	}

	return nil
}

func updatingSnapshots() bool {
	//nolint:forbidigo // a test toggle, read here on purpose; not application configuration
	value := strings.ToLower(strings.TrimSpace(os.Getenv(snapshotEnv)))

	return value != "" && value != "0" && value != "false"
}

func normalise(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		out := make(map[string]any, len(typed))

		for key, inner := range typed {
			switch key {
			case "version":
				out[key] = "<version>"
			case "app_secret":
				out[key] = "<fingerprint>"
			default:
				out[key] = normalise(inner)
			}
		}

		return out
	case []any:
		out := make([]any, len(typed))
		for index, inner := range typed {
			out[index] = normalise(inner)
		}

		return out
	case string:
		return normaliseString(typed)
	default:
		return value
	}
}

func normaliseString(value string) string {
	value = timestampPattern.ReplaceAllString(value, "<timestamp>")

	if strings.HasPrefix(value, "v1:") {
		return "<sealed>"
	}

	// an issued token is random by design; the snapshot asserts one came back
	if strings.HasPrefix(value, "spl_") {
		return "<token>"
	}

	if idempotencyKeyPattern.MatchString(value) {
		return "<idempotency_key>"
	}

	if refPattern.MatchString(value) {
		return "<ref>"
	}

	// a signed OAuth state is a timestamp and a MAC; the snapshot asserts it came back
	if statePattern.MatchString(value) {
		return statePattern.ReplaceAllString(value, "<state>")
	}

	return refInText.ReplaceAllString(value, "${1}<ref>${3}")
}

func sortedArrays(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		out := make(map[string]any, len(typed))

		for key, inner := range typed {
			out[key] = sortedArrays(inner)
		}

		return out
	case []any:
		out := make([]any, len(typed))

		for index, inner := range typed {
			out[index] = sortedArrays(inner)
		}

		sort.SliceStable(out, func(left, right int) bool {
			return fmt.Sprintf("%v", out[left]) < fmt.Sprintf("%v", out[right])
		})

		return out
	default:
		return value
	}
}
