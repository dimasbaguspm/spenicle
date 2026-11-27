package entity

import "time"

type Payee struct {
	ID                 int64
	Ref                string
	Name               string
	DefaultAccountRef  string
	DefaultCategoryRef string
	ArchivedAt         *time.Time
	CreatedAt          time.Time
}
