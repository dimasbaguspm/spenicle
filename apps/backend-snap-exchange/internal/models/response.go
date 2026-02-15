package models

import "time"

// AllRatesResponse returns all available currency rates
type AllRatesResponse struct {
	Rates       map[string]float64 `json:"rates"`
	Base        string             `json:"base"`
	LastUpdated time.Time          `json:"last_updated"`
}

// ConversionResponse returns the conversion rate between two currencies
type ConversionResponse struct {
	From        string    `json:"from"`
	To          string    `json:"to"`
	Rate        float64   `json:"rate"`
	Base        string    `json:"base"`
	LastUpdated time.Time `json:"last_updated"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error  string `json:"error"`
	Status int    `json:"status"`
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status      string    `json:"status"`
	RatesCount  int       `json:"rates_count"`
	LastUpdated time.Time `json:"last_updated"`
}
