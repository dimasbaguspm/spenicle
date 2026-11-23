// Package clock provides the time and identifier contracts plus their system
// implementations. Injecting them keeps use cases testable without a monkey
// patch or a sleep.
package clock

import (
	"crypto/rand"
	"encoding/binary"
	"fmt"
	"time"
)

const (
	uuidVersion7 = 0x70
	uuidVariant  = 0x80
	maskVersion  = 0x0f
	maskVariant  = 0x3f
	msHighShift  = 32
)

type Clock interface {
	Now() time.Time
}

type IDs interface {
	NewID() string
}

type System struct{}

func (System) Now() time.Time { return time.Now().UTC() }

type Zoned struct{ Loc *time.Location }

func (z Zoned) Now() time.Time {
	if z.Loc == nil {
		return time.Now().UTC()
	}

	return time.Now().In(z.Loc)
}

func (System) NewID() string {
	var raw [16]byte

	ms := uint64(time.Now().UTC().UnixMilli())

	//nolint:gosec // truncation is the point: UUIDv7 keeps the low 48 bits of millis
	binary.BigEndian.PutUint16(raw[0:2], uint16(ms>>msHighShift))
	//nolint:gosec // truncation is the point: UUIDv7 keeps the low 48 bits of millis
	binary.BigEndian.PutUint32(raw[2:6], uint32(ms))

	if _, err := rand.Read(raw[6:]); err != nil {
		panic(fmt.Sprintf("clock: entropy: %v", err))
	}

	raw[6] = (raw[6] & maskVersion) | uuidVersion7
	raw[8] = (raw[8] & maskVariant) | uuidVariant

	return fmt.Sprintf("%x-%x-%x-%x-%x", raw[0:4], raw[4:6], raw[6:8], raw[8:10], raw[10:16])
}
