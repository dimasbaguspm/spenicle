// Package clockx provides the real clock and UUIDv7 identifiers.
package clockx

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

// Clock is the production port.Clock.
type Clock struct{}

// Now returns UTC time.
func (Clock) Now() time.Time { return time.Now().UTC() }

// IDs mints UUIDv7 values, which sort by creation time.
type IDs struct{}

// NewID returns a UUIDv7 string.
func (IDs) NewID() string {
	var raw [16]byte

	ms := uint64(time.Now().UTC().UnixMilli())

	//nolint:gosec // truncation is the point: UUIDv7 keeps the low 48 bits of millis
	binary.BigEndian.PutUint16(raw[0:2], uint16(ms>>msHighShift))
	//nolint:gosec // truncation is the point: UUIDv7 keeps the low 48 bits of millis
	binary.BigEndian.PutUint32(raw[2:6], uint32(ms))

	if _, err := rand.Read(raw[6:]); err != nil {
		// crypto/rand failing is unrecoverable; a fake id would be worse.
		panic(fmt.Sprintf("clockx: entropy: %v", err))
	}

	raw[6] = (raw[6] & maskVersion) | uuidVersion7
	raw[8] = (raw[8] & maskVariant) | uuidVariant

	return fmt.Sprintf("%x-%x-%x-%x-%x", raw[0:4], raw[4:6], raw[6:8], raw[8:10], raw[10:16])
}
