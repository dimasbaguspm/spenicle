package sqlite

import "strings"

func placeholders(n int) string {
	if n <= 0 {
		return ""
	}

	return strings.TrimSuffix(strings.Repeat("?, ", n), ", ")
}
