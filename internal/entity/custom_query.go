package entity

import "time"

type CustomQuery struct {
	ID        int64
	Ref       string
	Name      string
	Namespace string
	Chart     string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type CategoryTotal struct {
	AccountRef      string
	AccountName     string
	Kind            string
	AmountMinor     int64
	FirstOccurredOn string
	LastOccurredOn  string
}
