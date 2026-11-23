package entity

import (
	"crypto/rand"
	"encoding/hex"
)

const (
	refBytes       = 16
	refVersion     = 0x40
	refVariant     = 0x80
	refVersionAt   = 6
	refVariantAt   = 8
	refVersionMask = 0x0f
	refVariantMask = 0x3f
)

func NewRef() string {
	raw := make([]byte, refBytes)

	if _, err := rand.Read(raw); err != nil {
		panic("entity: no entropy for a ref: " + err.Error())
	}

	raw[refVersionAt] = (raw[refVersionAt] & refVersionMask) | refVersion
	raw[refVariantAt] = (raw[refVariantAt] & refVariantMask) | refVariant

	return hex.EncodeToString(raw)
}
