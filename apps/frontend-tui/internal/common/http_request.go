package common

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

func DoHTTPRequest[Req, Resp any](client HTTPClient, method, url string, requestBody Req) (Resp, error) {
	var zero Resp

	requestData, err := json.Marshal(requestBody)
	if err != nil {
		return zero, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest(method, url, bytes.NewBuffer(requestData))
	if err != nil {
		return zero, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return zero, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return zero, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return zero, fmt.Errorf("request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var response Resp
	if err := json.Unmarshal(body, &response); err != nil {
		return zero, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return response, nil
}
