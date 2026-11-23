package uat

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/url"
	"strings"

	"github.com/cucumber/godog"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

func sendWithoutBody(ctx context.Context, method, path string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.do(ctx, method, path, nil)
}

func sendWithBody(ctx context.Context, method, path string, doc *godog.DocString) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	body, err := w.expand(doc.Content)
	if err != nil {
		return ctx, err
	}

	return ctx, w.do(ctx, method, path, []byte(body))
}

func theRequestBodyIs(ctx context.Context, body *godog.DocString) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	w.pendingBody = []byte(body.Content)

	return ctx, nil
}

func sendWithRequestTable(
	ctx context.Context,
	method, path string,
	table *godog.Table,
) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	headers, query, err := splitRequestTable(table)
	if err != nil {
		return ctx, err
	}

	body := w.pendingBody
	w.pendingBody = nil

	if len(body) > 0 {
		expanded, expandErr := w.expand(string(body))
		if expandErr != nil {
			return ctx, expandErr
		}

		body = []byte(expanded)
	}

	return ctx, w.doWith(ctx, method, path, body, headers, query)
}

func splitRequestTable(table *godog.Table) (http.Header, url.Values, error) {
	if len(table.Rows) < 2 {
		return nil, nil, errors.New("the request table needs a header and at least one row")
	}

	headers := http.Header{}
	query := url.Values{}

	for _, row := range table.Rows[1:] {
		if len(row.Cells) < 3 {
			return nil, nil, errors.New("each request row needs type, key and value")
		}

		kind := strings.ToLower(strings.TrimSpace(row.Cells[0].Value))
		key := strings.TrimSpace(row.Cells[1].Value)
		value := row.Cells[2].Value

		switch kind {
		case "header":
			headers.Add(key, value)
		case "query":
			query.Add(key, value)
		default:
			return nil, nil, fmt.Errorf("unknown request row type %q (header or query)", kind)
		}
	}

	return headers, query, nil
}

func sendWithArtifact(ctx context.Context, method, path, filename string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	var body bytes.Buffer

	form := multipart.NewWriter(&body)

	part, err := form.CreateFormFile("file", filename)
	if err != nil {
		return ctx, fmt.Errorf("file part: %w", err)
	}

	if _, err = part.Write([]byte("uat artifact bytes")); err != nil {
		return ctx, fmt.Errorf("artifact: %w", err)
	}

	if err = form.WriteField("kind", constant.CaptureKindImage); err != nil {
		return ctx, fmt.Errorf("kind field: %w", err)
	}

	if err = form.Close(); err != nil {
		return ctx, fmt.Errorf("close form: %w", err)
	}

	headers := http.Header{"Content-Type": []string{form.FormDataContentType()}}

	return ctx, w.doWith(ctx, method, path, body.Bytes(), headers, nil)
}
