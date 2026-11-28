// Package constant holds every fixed value the code shares. If a literal is
// used in more than one package, it belongs here; if it is used once, it stays
// where it is read. One file per area, so a value is found where its feature is.
package constant

import "time"

const (
	DateLayout      = "2006-01-02"
	MonthLayout     = "2006-01"
	TimestampLayout = time.RFC3339
	ISOCodeLength   = 3
)
