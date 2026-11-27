// Package handlers turns HTTP requests into module calls. It owns the request
// shapes and the status codes; it owns no business rule, no route and no
// middleware. The route table lives in the command that mounts it.
package handlers

import (
	"net/http"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
)

type Server struct {
	deps     Deps
	location *time.Location
}

func New(deps Deps) *Server {
	return &Server{deps: deps, location: loadLocation(deps.Timezone)}
}

func loadLocation(name string) *time.Location {
	if name == "" {
		return time.UTC
	}

	loc, err := time.LoadLocation(name)
	if err != nil {
		return time.UTC
	}

	return loc
}

func (s *Server) NotFound(w http.ResponseWriter, r *http.Request) {
	httpx.WriteError(w, http.StatusNotFound, "not_found", "no route for "+r.Method+" "+r.URL.Path)
}
