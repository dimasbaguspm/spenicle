package entity

import "time"

type Artifact struct {
	ID          int64
	Ref         string
	CaptureRef  string
	SHA256      string
	ContentType string
	Filename    string
	PlainBytes  int64
	StoredBytes int64
	CreatedAt   time.Time
	DeletedAt   *time.Time
}
