package scraper

import (
	"context"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/dimasbaguspm/spenicle-snap-exchange/internal/models"
)

type ECBScraper struct {
	url    string
	client *http.Client
}

func NewECBScraper(url string) *ECBScraper {
	return &ECBScraper{
		url: url,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// Fetch retrieves and parses ECB XML data
func (s *ECBScraper) Fetch(ctx context.Context) (map[string]float64, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch ECB data: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ECB returned status %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	rates, err := s.parseXML(data)
	if err != nil {
		return nil, fmt.Errorf("failed to parse XML: %w", err)
	}

	if len(rates) == 0 {
		return nil, fmt.Errorf("no rates found in ECB data")
	}

	return rates, nil
}

// parseXML unmarshals ECB XML and extracts currency rates
func (s *ECBScraper) parseXML(data []byte) (map[string]float64, error) {
	var envelope models.ECBEnvelope

	if err := xml.Unmarshal(data, &envelope); err != nil {
		return nil, fmt.Errorf("XML unmarshal failed: %w", err)
	}

	rates := make(map[string]float64)

	// Always add EUR as anchor with rate 1.0
	rates["EUR"] = 1.0

	// Extract rates from XML
	for _, cube := range envelope.Cube.Cube.Cubes {
		if cube.Currency == "" {
			continue
		}

		// Validate rate is positive
		if cube.Rate <= 0 {
			return nil, fmt.Errorf("invalid rate for %s: %f", cube.Currency, cube.Rate)
		}

		rates[cube.Currency] = cube.Rate
	}

	return rates, nil
}
