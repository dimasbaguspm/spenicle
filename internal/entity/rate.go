package entity

import "time"

type Rate struct {
	Ref       string
	Base      string
	Quote     string
	OnDate    time.Time
	Rate      string
	Source    string
	FetchedAt time.Time
}
