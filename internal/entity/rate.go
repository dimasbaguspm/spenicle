package entity

import "time"

type Rate struct {
	Base      string
	Quote     string
	OnDate    time.Time
	Rate      string
	Source    string
	FetchedAt time.Time
}
