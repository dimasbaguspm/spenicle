package entity

import "time"

// AppConfig is every knob the process has, with the default already applied by
// common/config. It lives here because it is a shared value: the composition root
// reads it, the HTTP handlers take their limits from it, telemetry takes its
// tracer name from it — none of them should own it.
//
// Nothing in this file reads the environment: defaults are declared in
// common/config so there is exactly one place that answers "what is the default
// timeout" and exactly one place that answers "where does it come from".
type AppConfig struct {
	// Addr is the listen address, DataDir the directory that holds the database.
	Addr    string
	DataDir string
	// DBPath is already joined from DataDir and the database file name.
	DBPath string

	// Credentials. AppSecret is mandatory: every sealed column depends on it.
	Password         string
	AppSecret        string
	SnapToJSONAPIKey string
	// AllowSecretReset lets a mismatched APP_SECRET start the process anyway by
	// discarding the sealed payloads. Off unless the operator asks for it.
	AllowSecretReset bool
	// OTLPEndpoint is host:port, optionally with a scheme. Empty disables export.
	OTLPEndpoint string
	// BaseCurrency is locked at first boot.
	BaseCurrency string

	// ServiceName is the single reference this process reports under: it becomes
	// resource.service.name, the tracer name, and the log field. One name, not two
	// that can drift apart.
	ServiceName string

	// HTTP server timeouts.
	ReadHeaderTimeout time.Duration
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	// ShutdownTimeout bounds a graceful stop.
	ShutdownTimeout time.Duration
	// TelemetryShutdownTimeout bounds the last span/metric flush.
	TelemetryShutdownTimeout time.Duration
	// HealthTimeout bounds the checks behind /healthz.
	HealthTimeout time.Duration

	// MaxBodyBytes caps one request body.
	MaxBodyBytes int64

	// Database pool: this is one process with one writer, so the numbers are small.
	DBMaxOpenConns int
	DBMaxIdleConns int
}

// Sealed reports whether an APP_SECRET was configured. It is required, so this is
// true for every running process; it stays a method so callers read like a fact.
func (c AppConfig) Sealed() bool { return c.AppSecret != "" }
