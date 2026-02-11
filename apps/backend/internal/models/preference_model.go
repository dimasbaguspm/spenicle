package models

// RefreshGeoCache represents a request to refresh the geolocation cache
type RefreshGeoCache struct {
	Latitude  *float64 `json:"latitude" doc:"User's latitude for distance-based ordering (optional)"`
	Longitude *float64 `json:"longitude" doc:"User's longitude for distance-based ordering (optional)"`
}
