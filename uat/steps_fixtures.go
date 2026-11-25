package uat

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/cucumber/godog"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

func theInstancePasswordIs(ctx context.Context, password string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.server != nil {
		return ctx, errors.New("set the instance password before starting the API")
	}

	w.password = password

	return ctx, nil
}

func theInstancePasswordMustBeChanged(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.server != nil {
		return ctx, errors.New("set the password change requirement before starting the API")
	}

	if w.password == "" {
		return ctx, errors.New(`set the instance password before requiring a change`)
	}

	w.passwordMustChange = true

	return ctx, nil
}

func iSignInWithTheInstancePassword(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.password == "" {
		return ctx, errors.New(`no instance password: add the step "the instance password is ..." first`)
	}

	w.credential = w.password
	w.rootCredential = w.password

	return ctx, nil
}

func theIssuedTokenIsTheBearer(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	var issued struct {
		Token string `json:"token"`
		Ref   string `json:"ref"`
	}

	if unmarshalErr := json.Unmarshal(w.body, &issued); unmarshalErr != nil {
		return ctx, fmt.Errorf("the token response is not JSON (%q): %w",
			preview(string(w.body)), unmarshalErr)
	}

	if issued.Token == "" {
		return ctx, errors.New("the response carries no token")
	}

	w.credential = issued.Token
	w.issued = issued.Token
	w.issuedRef = issued.Ref

	return ctx, nil
}

func theSameTokenIsTheBearerAgain(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.issued == "" {
		return ctx, errors.New("no token was issued in this scenario yet")
	}

	w.credential = w.issued

	return ctx, nil
}

func theRootCredentialOnly(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	w.credential = w.rootCredential

	return ctx, nil
}

func theAccountExists(ctx context.Context, name, kind string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.store == nil {
		return ctx, errors.New(`no running API: add the step "a running API" first`)
	}

	account, found, err := w.store.FindAccount(ctx, name, kind)
	if err != nil {
		return ctx, err
	}

	if !found {
		account, err = w.store.CreateAccount(ctx, name, kind, w.baseCurrency)
		if err != nil {
			return ctx, err
		}
	}

	w.accounts[name] = account.Ref

	return ctx, nil
}

func theJournalHolds(ctx context.Context, want int, kind string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	got, err := w.countAudit(ctx, kind)
	if err != nil {
		return ctx, err
	}

	if got != want {
		return ctx, fmt.Errorf("the journal holds %d %q rows, want %d", got, kind, want)
	}

	return ctx, nil
}

func theLastJournalRowNamesTheToken(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.store == nil {
		return ctx, errors.New(`no running API: add the step "a running API" first`)
	}

	var kind, ref string

	if err := w.store.DB().QueryRowContext(ctx,
		`SELECT actor_kind, COALESCE(actor_ref, '') FROM audit_log ORDER BY id DESC LIMIT 1`,
	).Scan(&kind, &ref); err != nil {
		return ctx, fmt.Errorf("read the last journal actor: %w", err)
	}

	if kind != constant.AuditActorUser || ref != w.issuedRef {
		return ctx, fmt.Errorf("the last journal row is %s/%q, want user/%q", kind, ref, w.issuedRef)
	}

	return ctx, nil
}

func theStoreHolds(ctx context.Context, table *godog.Table) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if len(table.Rows) < 2 {
		return ctx, errors.New("the store table needs a header and at least one row")
	}

	for i, row := range table.Rows {
		if i == 0 {
			continue
		}

		if len(row.Cells) < 2 {
			return ctx, fmt.Errorf("row %d needs a table name and a count", i)
		}

		name := strings.TrimSpace(row.Cells[0].Value)

		want, err := strconv.Atoi(strings.TrimSpace(row.Cells[1].Value))
		if err != nil {
			return ctx, fmt.Errorf("row %d count %q is not a number", i, row.Cells[1].Value)
		}

		got, err := w.countTable(ctx, name)
		if err != nil {
			return ctx, err
		}

		if got != want {
			return ctx, fmt.Errorf("%s holds %d rows, want %d", name, got, want)
		}
	}

	return ctx, nil
}

func theDatabaseIsCleared(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.clearDatabase(ctx)
}

func theLocalCacheIsCleared(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.rates == nil {
		return ctx, errors.New("no rates service: start the API with a rates endpoint")
	}

	w.rates.Clear()

	return ctx, nil
}

func theConnectionIsBroken(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.store == nil {
		return ctx, errors.New(`no running API: add the step "a running API" first`)
	}

	if closeErr := w.store.Close(ctx); closeErr != nil {
		return ctx, closeErr
	}

	w.dbBroken = true

	return ctx, nil
}
