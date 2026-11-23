// Package uuid mints the dashless UUIDv7 this project uses as a row reference: the
// first 48 bits are the unix epoch in milliseconds, so refs sort by creation, and the
// rest is entropy. Hex, no dashes: 32 lowercase characters.
package uuid

import (
	"crypto/rand"
	"encoding/binary"
	"encoding/hex"
	"time"
)

const (
	byteLen     = 16
	msBytes     = 6
	version     = 0x70
	variant     = 0x80
	versionAt   = 6
	variantAt   = 8
	versionMask = 0x0f
	variantMask = 0x3f
	stampBytes  = 8
	stampSkip   = 2
)

func New() string {
	raw := make([]byte, byteLen)

	var stamp [stampBytes]byte

	binary.BigEndian.PutUint64(stamp[:], uint64(time.Now().UnixMilli()))
	copy(raw[:msBytes], stamp[stampSkip:])

	if _, err := rand.Read(raw[msBytes:]); err != nil {
		panic("uuid: no entropy: " + err.Error())
	}

	raw[versionAt] = (raw[versionAt] & versionMask) | version
	raw[variantAt] = (raw[variantAt] & variantMask) | variant

	return hex.EncodeToString(raw)
}
