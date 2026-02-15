package storage

import (
	"testing"
	"time"
)

func TestNewRateStore(t *testing.T) {
	store := NewRateStore()

	if store == nil {
		t.Fatal("NewRateStore() returned nil")
	}

	if store.anchor != "EUR" {
		t.Errorf("Expected anchor to be EUR, got %s", store.anchor)
	}

	if !store.IsEmpty() {
		t.Error("Expected new store to be empty")
	}
}

func TestRateStore_UpdateAndGetRates(t *testing.T) {
	store := NewRateStore()

	rates := map[string]float64{
		"EUR": 1.0,
		"USD": 1.0820,
		"JPY": 160.58,
		"GBP": 0.8542,
	}

	store.UpdateRates(rates)

	if store.IsEmpty() {
		t.Error("Expected store to not be empty after update")
	}

	// Test GetRate
	usdRate, exists := store.GetRate("USD")
	if !exists {
		t.Error("Expected USD to exist")
	}
	if usdRate != 1.0820 {
		t.Errorf("Expected USD rate to be 1.0820, got %f", usdRate)
	}

	// Test non-existent currency
	_, exists = store.GetRate("XXX")
	if exists {
		t.Error("Expected XXX to not exist")
	}

	// Test GetAllRates returns copy
	allRates := store.GetAllRates()
	if len(allRates) != 4 {
		t.Errorf("Expected 4 rates, got %d", len(allRates))
	}

	// Modify returned map should not affect store
	allRates["USD"] = 999.0
	originalRate, _ := store.GetRate("USD")
	if originalRate != 1.0820 {
		t.Error("Store was mutated by external map modification")
	}
}

func TestRateStore_GetLastUpdated(t *testing.T) {
	store := NewRateStore()

	rates := map[string]float64{
		"EUR": 1.0,
		"USD": 1.0820,
	}

	before := time.Now()
	store.UpdateRates(rates)
	after := time.Now()

	lastUpdated := store.GetLastUpdated()

	if lastUpdated.Before(before) || lastUpdated.After(after) {
		t.Error("LastUpdated timestamp is not within expected range")
	}
}

func TestRateStore_ConvertRate(t *testing.T) {
	store := NewRateStore()

	rates := map[string]float64{
		"EUR": 1.0,
		"USD": 1.0820,
		"JPY": 160.58,
		"GBP": 0.8542,
	}

	store.UpdateRates(rates)

	tests := []struct {
		name        string
		from        string
		to          string
		expectError bool
		validate    func(rate float64) bool
	}{
		{
			name:        "Same currency",
			from:        "USD",
			to:          "USD",
			expectError: false,
			validate:    func(rate float64) bool { return rate == 1.0 },
		},
		{
			name:        "USD to EUR",
			from:        "USD",
			to:          "EUR",
			expectError: false,
			validate:    func(rate float64) bool { return rate > 0.9 && rate < 1.0 },
		},
		{
			name:        "EUR to USD",
			from:        "EUR",
			to:          "USD",
			expectError: false,
			validate:    func(rate float64) bool { return rate > 1.0 && rate < 1.1 },
		},
		{
			name:        "USD to JPY",
			from:        "USD",
			to:          "JPY",
			expectError: false,
			validate:    func(rate float64) bool { return rate > 140 && rate < 160 },
		},
		{
			name:        "Non-existent from currency",
			from:        "XXX",
			to:          "USD",
			expectError: true,
			validate:    nil,
		},
		{
			name:        "Non-existent to currency",
			from:        "USD",
			to:          "XXX",
			expectError: true,
			validate:    nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rate, err := store.ConvertRate(tt.from, tt.to)

			if tt.expectError {
				if err == nil {
					t.Error("Expected error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if tt.validate != nil && !tt.validate(rate) {
					t.Errorf("Rate validation failed: got %f", rate)
				}
			}
		})
	}
}

func TestRateStore_ConvertRate_CrossRate(t *testing.T) {
	store := NewRateStore()

	// EUR = 1.0, USD = 1.0820, so 1 USD should equal approximately 0.924 EUR
	rates := map[string]float64{
		"EUR": 1.0,
		"USD": 1.0820,
	}

	store.UpdateRates(rates)

	rate, err := store.ConvertRate("USD", "EUR")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	expected := 1.0 / 1.0820 // EUR/USD rate
	tolerance := 0.0001

	if rate < expected-tolerance || rate > expected+tolerance {
		t.Errorf("Expected rate ~%f, got %f", expected, rate)
	}
}

func TestRateStore_ThreadSafety(t *testing.T) {
	store := NewRateStore()

	rates := map[string]float64{
		"EUR": 1.0,
		"USD": 1.0820,
	}

	store.UpdateRates(rates)

	// Run concurrent reads and writes
	done := make(chan bool)

	// Multiple readers
	for i := 0; i < 10; i++ {
		go func() {
			for j := 0; j < 100; j++ {
				store.GetRate("USD")
				store.GetAllRates()
				store.GetLastUpdated()
				store.ConvertRate("USD", "EUR")
			}
			done <- true
		}()
	}

	// Single writer
	go func() {
		for i := 0; i < 100; i++ {
			newRates := map[string]float64{
				"EUR": 1.0,
				"USD": 1.0820 + float64(i)*0.001,
			}
			store.UpdateRates(newRates)
			time.Sleep(time.Millisecond)
		}
		done <- true
	}()

	// Wait for all goroutines
	for i := 0; i < 11; i++ {
		<-done
	}
}

func TestRateStore_IsEmpty(t *testing.T) {
	store := NewRateStore()

	if !store.IsEmpty() {
		t.Error("New store should be empty")
	}

	rates := map[string]float64{
		"EUR": 1.0,
	}
	store.UpdateRates(rates)

	if store.IsEmpty() {
		t.Error("Store should not be empty after update")
	}

	// Empty update
	store.UpdateRates(map[string]float64{})

	if !store.IsEmpty() {
		t.Error("Store should be empty after empty update")
	}
}

func TestRateStore_GetAnchor(t *testing.T) {
	store := NewRateStore()

	anchor := store.GetAnchor()
	if anchor != "EUR" {
		t.Errorf("Expected anchor to be EUR, got %s", anchor)
	}
}
