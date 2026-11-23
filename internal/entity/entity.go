// Package entity holds the shared structs and the invariants that must hold
// forever. It imports nothing but the standard library and constant, so every
// other package can depend on it without creating a cycle.
package entity

// This file is the package's public surface: the value types other packages
// name directly. Behaviour lives next to the type it belongs to (currency.go,
// money.go, entry.go, capture.go) rather than in a service; config.go holds the
// configuration value object, which is shared but not owned by any one layer.
