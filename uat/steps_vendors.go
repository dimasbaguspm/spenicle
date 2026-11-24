package uat

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
)

func theExtractionRailIs(ctx context.Context, rail string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.server != nil {
		return ctx, errors.New("choose the extraction rail before starting the API")
	}

	w.rail = rail

	return ctx, nil
}

func theExtractionVendorIsDown(ctx context.Context) (context.Context, error) {
	return setExtractionFault(ctx, faultDown)
}

func theExtractionVendorBreaksItsContract(ctx context.Context) (context.Context, error) {
	return setExtractionFault(ctx, faultBroken)
}

func theRatesVendorIsDown(ctx context.Context) (context.Context, error) {
	return setRatesFault(ctx, faultDown)
}

func theRatesVendorBreaksItsContract(ctx context.Context) (context.Context, error) {
	return setRatesFault(ctx, faultBroken)
}

func setExtractionFault(ctx context.Context, fault faultType) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.server != nil {
		return ctx, errors.New("break the extraction vendor before starting the API")
	}

	w.extractionFault = fault

	return ctx, nil
}

func setRatesFault(ctx context.Context, fault faultType) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.server != nil {
		return ctx, errors.New("break the rates vendor before starting the API")
	}

	w.ratesFault = fault

	return ctx, nil
}

func iCompleteTheGoogleAuthorisation(ctx context.Context, code string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	var started struct {
		State string `json:"state"`
	}

	if err := json.Unmarshal(w.body, &started); err != nil || started.State == "" {
		return ctx, errors.New(`no authorisation state: send a POST to "/api/connections/google" first`)
	}

	path := "/api/connections/google/callback?code=" + url.QueryEscape(code) +
		"&state=" + url.QueryEscape(started.State)

	if err := w.do(ctx, http.MethodGet, path, nil); err != nil {
		return ctx, fmt.Errorf("complete the authorisation: %w", err)
	}

	return ctx, nil
}
