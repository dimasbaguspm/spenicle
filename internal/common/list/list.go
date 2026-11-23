// Package list holds the shape every list route shares: the query parameters a
// client may send, the page limit, the cursor pagination and the envelope that
// carries a page and its meta. Identifiers are refs only, and no route or
// domain type lives here.
package list

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
)

const (
	DefaultLimit = 50
	MaxLimit     = 200
)

var refPattern = regexp.MustCompile(`^[0-9a-f]{32}$`) //nolint:gochecknoglobals // one pattern, compiled once

type Meta struct {
	Limit      int    `json:"limit"`
	HasMore    bool   `json:"has_more"`
	NextCursor string `json:"next_cursor,omitempty"`
}

type Params struct {
	Cursor     string `query:"cursor"      validate:"omitempty,ref"`
	Limit      int64  `query:"limit"       validate:"omitempty,gte=0,lte=200"`
	Query      string `query:"query"       validate:"omitempty,max=200"`
	Refs       string `query:"refs"        validate:"omitempty,max=4096"`
	Currency   string `query:"currency"    validate:"omitempty,currency"`
	Kind       string `query:"kind"        validate:"omitempty,accountkind"`
	ParentRef  string `query:"parent_ref"  validate:"omitempty,ref"`
	Archived   string `query:"archived"    validate:"omitempty,oneof=true false"`
	State      string `query:"state"       validate:"omitempty,recurringstate"`
	Cadence    string `query:"cadence"     validate:"omitempty,cadence"`
	Status     string `query:"status"      validate:"omitempty,capturestatus"`
	Source     string `query:"source"      validate:"omitempty,source"`
	AccountRef string `query:"account_ref" validate:"omitempty,ref"`
	From       string `query:"from"        validate:"omitempty,datestr"`
	To         string `query:"to"          validate:"omitempty,datestr"`
}

func (p Params) SplitRefs() ([]string, error) {
	if strings.TrimSpace(p.Refs) == "" {
		return nil, nil
	}

	parts := strings.Split(p.Refs, ",")
	out := make([]string, 0, len(parts))

	for _, part := range parts {
		ref := strings.TrimSpace(part)
		if ref == "" {
			continue
		}

		if !refPattern.MatchString(ref) {
			return nil, fmt.Errorf("refs: %q is not a ref", ref)
		}

		out = append(out, ref)
	}

	return out, nil
}

func ClampLimit(want int64) int {
	switch {
	case want <= 0:
		return DefaultLimit
	case want > MaxLimit:
		return MaxLimit
	default:
		return int(want)
	}
}

func Paginate[T any](items []T, limit int, refOf func(T) string) ([]T, Meta) {
	hasMore := len(items) > limit
	if hasMore {
		items = items[:limit]
	}

	next := ""
	if hasMore && len(items) > 0 {
		next = refOf(items[len(items)-1])
	}

	return items, Meta{Limit: limit, HasMore: hasMore, NextCursor: next}
}

func Write[T any](w http.ResponseWriter, key string, items []T, meta Meta) {
	if items == nil {
		items = make([]T, 0)
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{key: items, "meta": meta})
}
