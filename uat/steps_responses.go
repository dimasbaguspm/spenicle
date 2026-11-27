package uat

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"strings"
)

func responseStatusIs(ctx context.Context, want int) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.status != want {
		return ctx, fmt.Errorf("status is %d, want %d (body: %s)", w.status, want, string(w.body))
	}

	return ctx, nil
}

func responseHeaderIs(ctx context.Context, name, want string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	got := w.header.Get(name)
	if got != want {
		return ctx, fmt.Errorf("header %s is %q, want %q", name, got, want)
	}

	return ctx, nil
}

func responseHeaderContains(ctx context.Context, name, want string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	got := w.header.Get(name)
	if !strings.Contains(got, want) {
		return ctx, fmt.Errorf("header %s is %q, want it to contain %q", name, got, want)
	}

	return ctx, nil
}

func responseBodyHashesTo(ctx context.Context, want string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	sum := sha256.Sum256(w.body)
	got := hex.EncodeToString(sum[:])

	if got != strings.ToLower(strings.TrimSpace(want)) {
		return ctx, fmt.Errorf("the body hashes to %s, want %s (body %s)",
			got, want, preview(string(w.body)))
	}

	return ctx, nil
}

func theLastRefIsRemembered(ctx context.Context, name string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.lastRef == "" {
		return ctx, errors.New("no ref to remember: send a POST first")
	}

	w.refs[name] = w.lastRef

	return ctx, nil
}

func theLastRefIsStill(ctx context.Context, name string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	ref, ok := w.refs[name]
	if !ok {
		return ctx, fmt.Errorf(`unknown ref %q: add "the last ref is remembered as ..."`, name)
	}

	if w.lastRef != ref {
		return ctx, fmt.Errorf("the last ref is %s, want the remembered %s", w.lastRef, ref)
	}

	return ctx, nil
}

func responseCarriesRequestID(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	traceID := w.header.Get("X-Request-Id")
	if traceID == "" {
		return ctx, errors.New("no X-Request-Id header on the response")
	}

	if !regexp.MustCompile(`^[0-9a-f]{32}$`).MatchString(traceID) {
		return ctx, fmt.Errorf("X-Request-Id = %q, want a 32-hex trace id", traceID)
	}

	if traceID == "00000000000000000000000000000000" {
		return ctx, errors.New("X-Request-Id is the zero trace id")
	}

	return ctx, nil
}
