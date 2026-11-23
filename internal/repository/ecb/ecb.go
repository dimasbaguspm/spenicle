package ecb

import (
	"context"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

const (
	maxBodyBytes = 1 << 20
	baseCurrency = "EUR"
)

type TimeSource interface{ Now() time.Time }

type Client struct {
	endpoint string
	http     *http.Client
	clock    TimeSource
}

func New(endpoint string, timeout time.Duration, clock TimeSource) (*Client, error) {
	trimmed := strings.TrimSpace(endpoint)
	if trimmed == "" {
		return nil, errors.New("ecb endpoint is required")
	}

	return &Client{
		endpoint: trimmed,
		http:     &http.Client{Timeout: timeout, Transport: otelhttp.NewTransport(http.DefaultTransport)},
		clock:    clock,
	}, nil
}

func (c *Client) Daily(ctx context.Context) ([]entity.Rate, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Ecb.Daily")
	defer endSpan()

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, c.endpoint, http.NoBody)
	if err != nil {
		return nil, fmt.Errorf("build ecb request: %w", err)
	}

	response, err := c.http.Do(request)
	if err != nil {
		return nil, fmt.Errorf("fetch ecb rates: %w", err)
	}

	defer func() { _ = response.Body.Close() }()

	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ecb answered %s", response.Status)
	}

	body, err := io.ReadAll(io.LimitReader(response.Body, maxBodyBytes))
	if err != nil {
		return nil, fmt.Errorf("read ecb response: %w", err)
	}

	return c.parse(body)
}

func (c *Client) parse(body []byte) ([]entity.Rate, error) {
	var envelope dailyEnvelope

	if err := xml.Unmarshal(body, &envelope); err != nil {
		return nil, fmt.Errorf("decode ecb rates: %w", err)
	}

	if len(envelope.Days) == 0 {
		return nil, fmt.Errorf("%w: ecb returned no daily cube", entity.ErrNotFound)
	}

	day := envelope.Days[0]

	onDate, err := time.Parse(constant.DateLayout, strings.TrimSpace(day.Time))
	if err != nil {
		return nil, fmt.Errorf("ecb date %q: %w", day.Time, entity.ErrInvalidRate)
	}

	fetchedAt := c.clock.Now()
	rates := make([]entity.Rate, 0, len(day.Rates))

	for _, cube := range day.Rates {
		quote := strings.ToUpper(strings.TrimSpace(cube.Currency))
		raw := strings.TrimSpace(cube.Rate)

		if _, err := entity.ParseRate(raw); err != nil {
			return nil, fmt.Errorf("ecb rate for %s: %w", quote, err)
		}

		rates = append(rates, entity.Rate{
			Base:      baseCurrency,
			Quote:     quote,
			OnDate:    onDate,
			Rate:      raw,
			Source:    constant.FXSourceECB,
			FetchedAt: fetchedAt,
		})
	}

	return rates, nil
}

var _ repository.RateSource = (*Client)(nil)

type dailyEnvelope struct {
	Days []dailyCube `xml:"Cube>Cube"`
}

type dailyCube struct {
	Time  string     `xml:"time,attr"`
	Rates []rateCube `xml:"Cube"`
}

type rateCube struct {
	Currency string `xml:"currency,attr"`
	Rate     string `xml:"rate,attr"`
}
