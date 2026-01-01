package schema

import (
	"testing"
	"time"
)

func TestAccountSchema_ToJSON(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	as := AccountSchema{
		ID:        1,
		Name:      "Cash",
		Type:      "expense",
		Note:      "test",
		Amount:    50,
		CreatedAt: now,
	}
	if _, err := as.ToJSON(); err != nil {
		t.Fatalf("ToJSON failed: %v", err)
	}
}

func TestAccountSchema_FromJSON(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	as := AccountSchema{
		ID:        1,
		Name:      "Cash",
		Type:      "expense",
		Note:      "test",
		Amount:    50,
		CreatedAt: now,
	}
	b, err := as.ToJSON()
	if err != nil {
		t.Fatalf("ToJSON failed: %v", err)
	}
	var as2 AccountSchema
	if err := as2.FromJSON(b); err != nil {
		t.Fatalf("FromJSON failed: %v", err)
	}
	if as2.ID != as.ID || as2.Name != as.Name || as2.Type != as.Type || as2.Amount != as.Amount {
		t.Fatalf("roundtrip values differ: got %+v want %+v", as2, as)
	}
	if !as2.CreatedAt.Equal(as.CreatedAt) {
		t.Fatalf("createdAt mismatch: got %v want %v", as2.CreatedAt, as.CreatedAt)
	}
}
