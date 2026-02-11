package resources

import (
	"context"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

// PreferenceResource handles preference-related endpoints
type PreferenceResource struct {
	sevs services.RootService
}

// NewPreferenceResource creates a new preference resource
func NewPreferenceResource(sevs services.RootService) PreferenceResource {
	return PreferenceResource{sevs}
}

// RefreshGeoCache refreshes the geolocation cache in background
// Accepts user's current location and triggers async indexing of nearby transactions
func (pr PreferenceResource) RefreshGeoCache(ctx context.Context, input *struct {
	Body models.RefreshGeoCache
}) (*struct{}, error) {
	start := time.Now()
	defer func() { observability.RecordServiceOperation("preferences", "POST", time.Since(start).Seconds()) }()
	logger := observability.GetLogger(ctx).With("resource", "PreferenceResource", "operation", "RefreshGeoCache")
	logger.Info("start")

	// Trigger background geo cache refresh
	// This returns immediately while indexing happens asynchronously
	pr.sevs.Pref.RefreshGeoCache(ctx, input.Body.Latitude, input.Body.Longitude)

	logger.Info("geo cache refresh background job started")
	return nil, nil
}

// Routes registers all preference-related routes
func (pr PreferenceResource) Routes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "refresh-geo-cache",
		Method:      "POST",
		Path:        "/preferences/refresh-geo-cache",
		Summary:     "Refresh geolocation cache",
		Description: "Triggers background refresh of geolocation cache from database. Accepts optional user location to prioritize nearby transactions.",
		Tags:        []string{"Preferences"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, pr.RefreshGeoCache)
}
