package entity

import (
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

// Connection is one authorised provider account. The three token fields hold sealed
// values: only the connections module opens them, and the store never sees plaintext.
type Connection struct {
	ID              int64
	Ref             string
	Provider        string
	Account         string
	ExternalSub     string
	Scopes          []string
	RefreshToken    string
	AccessToken     string
	AccessExpiresAt time.Time
	Status          string
	LastRefreshedAt time.Time
	RevokedAt       *time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// Usable reports whether the stored grant may be used without prompting the user.
func (c Connection) Usable() bool {
	return c.Status == constant.ConnectionStatusActive && c.RevokedAt == nil
}
