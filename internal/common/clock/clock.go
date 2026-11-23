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
	// uuidVersion7 marks the layout; uuidVariant is RFC 4122 variant 10.
	uuidVersion7 = 0x70
	uuidVariant  = 0x80
	maskVersion  = 0x0f
	maskVariant  = 0x3f
	msHighShift  = 32
)

// Clock is the time contract. The only thing a caller may do is ask what time it
// is; anything more would be a business rule.
type Clock interface {
	Now() time.Time
}

// IDs is the identifier contract. UUIDv7 so that ids sort by creation time.
type IDs interface {
	NewID() string
}

// System is the production implementation of both contracts.
type System struct{}

// Now returns UTC time.
func (System) Now() time.Time { return time.Now().UTC() }

// NewID returns a UUIDv7 string.
func (System) NewID() string {
	var raw [16]byte

	ms := uint64(time.Now().UTC().UnixMilli())

	//nolint:gosec // truncation is the point: UUIDv7 keeps the low 48 bits of millis
	binary.BigEndian.PutUint16(raw[0:2], uint16(ms>>msHighShift))
	//nolint:gosec // truncation is the point: UUIDv7 keeps the low 48 bits of millis
	binary.BigEndian.PutUint32(raw[2:6], uint32(ms))

	if _, err := rand.Read(raw[6:]); err != nil {
		// crypto/rand failing is unrecoverable; a fake id would be worse.
		panic(fmt.Sprintf("clock: entropy: %v", err))
	}

	raw[6] = (raw[6] & maskVersion) | uuidVersion7
	raw[8] = (raw[8] & maskVariant) | uuidVariant

	return fmt.Sprintf("%x-%x-%x-%x-%x", raw[0:4], raw[4:6], raw[6:8], raw[8:10], raw[10:16])
}
