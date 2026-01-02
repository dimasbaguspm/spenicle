package utils

import (
	"html"
	"regexp"
	"strings"
)

var htmlTagRegex = regexp.MustCompile(`<[^>]*>`)

// SanitizeString cleans user input to prevent XSS attacks and normalize whitespace.
// It performs the following operations:
// - Trims leading/trailing whitespace
// - Removes HTML tags
// - Unescapes HTML entities then re-escapes them (normalize)
// - Collapses multiple spaces into one
func SanitizeString(input string) string {
	s := strings.TrimSpace(input)
	s = htmlTagRegex.ReplaceAllString(s, "")
	s = html.UnescapeString(s)
	s = html.EscapeString(s)
	s = strings.Join(strings.Fields(s), " ")

	return s
}

// SanitizeStringPtr sanitizes a string pointer and returns the sanitized pointer.
// Returns nil if input is nil, otherwise returns pointer to sanitized string.
func SanitizeStringPtr(input *string) *string {
	if input == nil {
		return nil
	}
	sanitized := SanitizeString(*input)
	return &sanitized
}
