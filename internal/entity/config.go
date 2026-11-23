package entity

import "time"

type AppConfig struct {
	Addr    string
	DataDir string
	DBPath  string

	ArtifactDir       string
	ArtifactRetention time.Duration
	ArtifactMaxBytes  int64

	ImportMaxBytes    int64
	ImportMaxRows     int
	ImportCommitChunk int

	ExportDir        string
	ExportRetention  time.Duration
	ExportStaleAfter time.Duration

	AppSecret          string `validate:"required,min=16"`
	SnapToJSONAPIKey   string
	SnapToJSONEndpoint string
	SnapToJSONTimeout  time.Duration
	ECBEndpoint        string
	ECBTimeout         time.Duration
	OpenAIAPIKey       string
	OpenAIHost         string
	OpenAIModel        string
	OTLPEndpoint       string

	ServiceName string

	Timezone string

	WebOrigin string

	ReadHeaderTimeout        time.Duration
	ReadTimeout              time.Duration
	WriteTimeout             time.Duration
	IdleTimeout              time.Duration
	ShutdownTimeout          time.Duration
	TelemetryShutdownTimeout time.Duration
	HealthTimeout            time.Duration
	WorkerInterval           time.Duration

	MaxBodyBytes int64

	DBMaxOpenConns int
	DBMaxIdleConns int
}

func (c AppConfig) Sealed() bool { return c.AppSecret != "" }

func (c AppConfig) AIAssistance() bool {
	return c.OpenAIHost != "" && c.OpenAIAPIKey != "" && c.OpenAIModel != ""
}
