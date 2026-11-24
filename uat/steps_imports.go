package uat

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"

	"github.com/cucumber/godog"
)

func uploadStatement(
	ctx context.Context,
	filename, clientID string,
	statement *godog.DocString,
) (context.Context, error) {
	return uploadStatementFor(ctx, filename, clientID, "", statement)
}

func uploadStatementOnAccount(
	ctx context.Context,
	filename, clientID, account string,
	statement *godog.DocString,
) (context.Context, error) {
	return uploadStatementFor(ctx, filename, clientID, account, statement)
}

func uploadStatementFor(
	ctx context.Context,
	filename, clientID, account string,
	statement *godog.DocString,
) (context.Context, error) {
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

	if _, err = part.Write([]byte(statement.Content)); err != nil {
		return ctx, fmt.Errorf("statement: %w", err)
	}

	if err = form.WriteField("client_id", clientID); err != nil {
		return ctx, fmt.Errorf("client id field: %w", err)
	}

	if account != "" {
		ref, ok := w.accounts[account]
		if !ok {
			return ctx, fmt.Errorf(
				`unknown account %q: create it with "the account ... exists as ..."`, account,
			)
		}

		if err = form.WriteField("account_ref", ref); err != nil {
			return ctx, fmt.Errorf("account field: %w", err)
		}
	}

	if err = form.Close(); err != nil {
		return ctx, fmt.Errorf("close form: %w", err)
	}

	headers := http.Header{"Content-Type": []string{form.FormDataContentType()}}

	return ctx, w.doWith(ctx, http.MethodPost, "/api/imports", body.Bytes(), headers, nil)
}

func theLedgerHoldsEntry(ctx context.Context, prefix, source string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.store == nil {
		return ctx, errors.New(`no running API: add the step "a running API" first`)
	}

	var count int

	query := `SELECT COUNT(*) FROM ledger_entries WHERE client_id LIKE ? ESCAPE '\' AND source = ?`

	row := w.store.DB().QueryRowContext(ctx, query, escapeLikeForUAT(prefix)+"%", source)

	if err = row.Scan(&count); err != nil {
		return ctx, fmt.Errorf("count imported entries: %w", err)
	}

	if count == 0 {
		return ctx, fmt.Errorf("no entry holds a client id starting with %q and source %q", prefix, source)
	}

	return ctx, nil
}

func escapeLikeForUAT(value string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(value)
}

func theImportEventLogHolds(ctx context.Context, want int, kind string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	got, err := w.countImportEvents(ctx, kind)
	if err != nil {
		return ctx, err
	}

	if got != want {
		return ctx, fmt.Errorf("the import event log holds %d %q events, want %d", got, kind, want)
	}

	return ctx, nil
}

func uploadStatementChunk(
	ctx context.Context,
	index, total int,
	filename, clientID string,
	statement *godog.DocString,
) (context.Context, error) {
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

	if _, err = part.Write([]byte(statement.Content)); err != nil {
		return ctx, fmt.Errorf("statement chunk: %w", err)
	}

	for key, value := range map[string]string{
		"client_id":   clientID,
		"chunk_index": strconv.Itoa(index),
		"chunk_total": strconv.Itoa(total),
	} {
		if err = form.WriteField(key, value); err != nil {
			return ctx, fmt.Errorf("%s field: %w", key, err)
		}
	}

	if err = form.Close(); err != nil {
		return ctx, fmt.Errorf("close form: %w", err)
	}

	headers := http.Header{"Content-Type": []string{form.FormDataContentType()}}

	return ctx, w.doWith(ctx, http.MethodPost, "/api/imports", body.Bytes(), headers, nil)
}
