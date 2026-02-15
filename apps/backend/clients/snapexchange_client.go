package clients

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type SnapExchangeConversionResponse struct {
	From        string    `json:"from"`
	To          string    `json:"to"`
	Rate        float64   `json:"rate"`
	Base        string    `json:"base"`
	LastUpdated time.Time `json:"last_updated"`
}

type SnapExchangeClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewSnapExchangeClient() *SnapExchangeClient {
	return &SnapExchangeClient{
		baseURL: os.Getenv("SNAP_EXCHANGE_URL"),
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (c *SnapExchangeClient) GetConversionRate(ctx context.Context, from, to string) (float64, error) {
	url := fmt.Sprintf("%s/%s?to=%s", c.baseURL, from, to)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return 0, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch conversion rate: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return 0, fmt.Errorf("snap-exchange returned %d: %s", resp.StatusCode, string(body))
	}

	var result SnapExchangeConversionResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return 0, fmt.Errorf("failed to decode response: %w", err)
	}

	return result.Rate, nil
}

func (c *SnapExchangeClient) HealthCheck(ctx context.Context) error {
	url := fmt.Sprintf("%s/health", c.baseURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("health check failed with status %d", resp.StatusCode)
	}

	return nil
}
