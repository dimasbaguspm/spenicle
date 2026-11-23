package entity

import "time"

type Payee struct {
	ID                 int64
	Ref                string
	Name               string
	DefaultAccountID   *int64
	DefaultCategoryID  *int64
	DefaultAccountRef  string
	DefaultCategoryRef string
	ArchivedAt         *time.Time
	CreatedAt          time.Time
}
