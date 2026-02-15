package observability

import (
	"crypto/rand"
	"fmt"
)

func GenerateID() string {
	bytes := make([]byte, 8)
	rand.Read(bytes)
	return fmt.Sprintf("%x", bytes)
}
