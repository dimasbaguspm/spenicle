//go:build web

package web

import (
	"embed"
	"io/fs"
)

// Dist is the SPA build. `all:` keeps the files a plain `dist` would drop: Vite emits the
// manifest, the service worker and the icon set next to the hashed assets, and a missing
// dot-file is a broken install rather than a smaller binary.
//
//go:embed all:dist
var Dist embed.FS

// Assets reports the embedded SPA, or nothing when this binary was built without it.
func Assets() (fs.FS, bool) {
	files, err := fs.Sub(Dist, "dist")
	if err != nil {
		return nil, false
	}

	return files, true
}
