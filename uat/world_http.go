package uat

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
)

func (w *world) do(ctx context.Context, method, path string, body []byte) error {
	return w.doWith(ctx, method, path, body, nil, nil)
}

func (w *world) doWith(
	ctx context.Context,
	method, path string,
	body []byte,
	headers http.Header,
	query url.Values,
) error {
	if w.server == nil {
		return errors.New(`no running API: add the step "a running API" first`)
	}

	path, err := w.substituteRefs(path)
	if err != nil {
		return err
	}

	return w.call(ctx, method, path, body, headers, query)
}

func (w *world) call(
	ctx context.Context,
	method, path string,
	body []byte,
	headers http.Header,
	query url.Values,
) error {
	var reader io.Reader

	if body != nil {
		reader = strings.NewReader(string(body))
	}

	target := w.server.URL + path
	if len(query) > 0 {
		target += "?" + query.Encode()
	}

	req, err := http.NewRequestWithContext(ctx, method, target, reader)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}

	w.dress(req, body, headers)

	resp, err := w.server.Client().Do(req)
	if err != nil {
		return fmt.Errorf("call %s %s: %w", method, path, err)
	}

	defer func() { _ = resp.Body.Close() }()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read body: %w", err)
	}

	w.status = resp.StatusCode
	w.body = raw

	w.header = resp.Header
	if method == http.MethodPost {
		w.lastRef = refOf(raw)
	}

	return nil
}

// dress applies the scenario's headers and the credential it has earned: the
// root credential from sign-in, or an API token that replaced it.
func (w *world) dress(req *http.Request, body []byte, headers http.Header) {
	for key, values := range headers {
		for _, value := range values {
			req.Header.Add(key, value)
		}
	}

	if body != nil && req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}

	if w.credential != "" {
		req.Header.Set("Authorization", "Bearer "+w.credential)
	}
}

func refOf(body []byte) string {
	var document map[string]any

	if err := json.Unmarshal(body, &document); err != nil {
		return ""
	}

	for _, key := range []string{"ref", "capture", "entry", "captures", "entries"} {
		switch typed := document[key].(type) {
		case string:
			return typed
		case map[string]any:
			if ref, ok := typed["ref"].(string); ok {
				return ref
			}
		case []any:
			if len(typed) == 0 {
				continue
			}

			if row, ok := typed[0].(map[string]any); ok {
				if ref, ok := row["ref"].(string); ok {
					return ref
				}
			}
		}
	}

	return ""
}

var (
	accountPlaceholder = regexp.MustCompile(`\{\{account:([^}]+)\}\}`)
	refPlaceholder     = regexp.MustCompile(`\{\{ref:([^}]+)\}\}`)
)

func (w *world) expand(body string) (string, error) {
	var missing []string

	out := accountPlaceholder.ReplaceAllStringFunc(body, func(match string) string {
		name := accountPlaceholder.FindStringSubmatch(match)[1]

		ref, ok := w.accounts[name]
		if !ok {
			missing = append(missing, name)

			return match
		}

		return ref
	})

	out, err := w.substituteRefs(out)
	if err != nil {
		return "", err
	}

	if len(missing) > 0 {
		return "", fmt.Errorf(`unknown account(s) %s: create them with "the account ... exists as ..."`,
			strings.Join(missing, ", "))
	}

	return out, nil
}

func (w *world) substituteRefs(text string) (string, error) {
	var missing []string

	out := refPlaceholder.ReplaceAllStringFunc(text, func(match string) string {
		name := refPlaceholder.FindStringSubmatch(match)[1]

		ref, ok := w.refs[name]
		if !ok {
			missing = append(missing, name)

			return match
		}

		return ref
	})

	if len(missing) > 0 {
		return "", fmt.Errorf(`unknown ref(s) %s: add "the last ref is remembered as ..."`,
			strings.Join(missing, ", "))
	}

	return strings.ReplaceAll(out, "{{ref}}", w.lastRef), nil
}

func preview(body string) string {
	if len(body) > maxPreview {
		return body[:maxPreview] + "..."
	}

	return body
}
