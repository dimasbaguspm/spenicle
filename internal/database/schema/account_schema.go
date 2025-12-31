package schema

import (
	"encoding/json"
	"time"
)

// AccountTableName is the name of the accounts table in the database
var AccountTableName = "accounts"

// AccountSchema represents the schema for an account
type AccountSchema struct {
	ID        int64      `json:"id"`
	Name      string     `json:"name"`
	Type      string     `json:"type"`
	Note      string     `json:"note"`
	Amount    int64      `json:"amount"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt *time.Time `json:"updatedAt,omitempty"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
}

// ToJSON converts AccountSchema to a JSON-compatible map
func (as *AccountSchema) ToJSON() ([]byte, error) {
	return json.Marshal(as)
}

// FromJSON populates AccountSchema from a JSON-compatible map
func (as *AccountSchema) FromJSON(data []byte) error {
	return json.Unmarshal(data, as)
}
