// Package clockx provides the real clock and UUIDv7 identifiers.
package clockx

import (
	"crypto/rand"
	"encoding/binary"
	"fmt"
	"time"
)

// Clock is the production port.Clock.
type Clock struct{}

// Now returns UTC time.
func (Clock) Now() time.Time { return time.Now().UTC() }

// IDs mints UUIDv7 values, which sort by creation time.
type IDs struct{}

// NewID returns a UUIDv7 string.
func (IDs) NewID() string {
	var b [16]byte
	ms := uint64(time.Now().UTC().UnixMilli())

	binary.BigEndian.PutUint16(b[0:2], uint16(ms>>32))
	binary.BigEndian.PutUint32(b[2:6], uint32(ms))
	if _, err := rand.Read(b[6:]); err != nil {
		// crypto/rand failing is unrecoverable; caller shouldn't see a fake id.
		panic(fmt.Sprintf("clockx: entropy: %v", err))
	}
	b[6] = (b[6] & 0x0f) | 0x70 // version 7
	b[8] = (b[8] & 0x3f) | 0x80 // variant 10

	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
