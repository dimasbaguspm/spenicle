//go:build !web

// Package web carries the built SPA and decides, at compile time, whether this binary
// serves it.
//
// The switch is the `web` build tag, never an environment variable: a self-hoster must not
// be able to turn the UI on in a binary that was built without it, and the release images
// pick the tag per target. Building with `-tags web` needs `web/dist` to exist, which is
// what `make web` produces.
package web

import "io/fs"

// Assets reports the embedded SPA, or nothing when this binary was built without it.
func Assets() (fs.FS, bool) {
	return nil, false
}
