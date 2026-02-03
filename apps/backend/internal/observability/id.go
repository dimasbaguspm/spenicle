package observability

import (
	"crypto/rand"
	"fmt"
)

// GenerateID creates a random ID for requests and tracking
func GenerateID() string {
	bytes := make([]byte, 8)
	rand.Read(bytes)
	return fmt.Sprintf("%x", bytes)
}
