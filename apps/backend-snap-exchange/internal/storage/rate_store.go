package storage

import (
	"fmt"
	"sync"
	"time"
)

type RateStore struct {
	mu          sync.RWMutex
	rates       map[string]float64 // e.g., "USD" -> 1.0820
	lastUpdated time.Time
	anchor      string // "EUR"
}

func NewRateStore() *RateStore {
	return &RateStore{
		rates:  make(map[string]float64),
		anchor: "EUR",
	}
}

// GetRate retrieves the rate for a specific currency
func (rs *RateStore) GetRate(currency string) (float64, bool) {
	rs.mu.RLock()
	defer rs.mu.RUnlock()

	rate, exists := rs.rates[currency]
	return rate, exists
}

// GetAllRates returns a copy of all rates to prevent external mutation
func (rs *RateStore) GetAllRates() map[string]float64 {
	rs.mu.RLock()
	defer rs.mu.RUnlock()

	// Defensive copy
	ratesCopy := make(map[string]float64, len(rs.rates))
	for k, v := range rs.rates {
		ratesCopy[k] = v
	}

	return ratesCopy
}

// UpdateRates performs flush and replace strategy
func (rs *RateStore) UpdateRates(rates map[string]float64) {
	rs.mu.Lock()
	defer rs.mu.Unlock()

	// Atomic swap
	rs.rates = rates
	rs.lastUpdated = time.Now()
}

// GetLastUpdated returns the timestamp of the last successful update
func (rs *RateStore) GetLastUpdated() time.Time {
	rs.mu.RLock()
	defer rs.mu.RUnlock()

	return rs.lastUpdated
}

// ConvertRate calculates the cross-rate conversion from one currency to another
// X→Y = (1/rate[X]) × rate[Y]
func (rs *RateStore) ConvertRate(from, to string) (float64, error) {
	rs.mu.RLock()
	defer rs.mu.RUnlock()

	// Check if currencies exist
	fromRate, fromExists := rs.rates[from]
	if !fromExists {
		return 0, fmt.Errorf("currency not found: %s", from)
	}

	toRate, toExists := rs.rates[to]
	if !toExists {
		return 0, fmt.Errorf("currency not found: %s", to)
	}

	// Calculate cross-rate
	// If both currencies are the same, return 1.0
	if from == to {
		return 1.0, nil
	}

	// ECB rates are EUR-based, so we need to convert
	// To convert from X to Y: (1/X) * Y
	return toRate / fromRate, nil
}

// IsEmpty checks if the store has any rates loaded
func (rs *RateStore) IsEmpty() bool {
	rs.mu.RLock()
	defer rs.mu.RUnlock()

	return len(rs.rates) == 0
}

// GetAnchor returns the anchor currency (EUR)
func (rs *RateStore) GetAnchor() string {
	return rs.anchor
}
