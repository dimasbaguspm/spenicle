// Package clock provides the time contract plus its system implementations.
// Injecting it keeps use cases testable without a monkey patch or a sleep.
package clock

import "time"

type System struct{}

func (System) Now() time.Time { return time.Now().UTC() }

type Zoned struct{ Loc *time.Location }

func (z Zoned) Now() time.Time {
	if z.Loc == nil {
		return time.Now().UTC()
	}

	return time.Now().In(z.Loc)
}
