# SnapExchange

A lightweight, self-hosted currency exchange rate microservice that retrieves real-time rates from the European Central Bank (ECB).

## Features

- ✅ **Zero API Keys**: No external dependencies, completely self-hosted
- ✅ **Minimal Footprint**: <10MB RAM, <15MB binary size
- ✅ **Blazing Fast**: <1ms response time via in-memory storage
- ✅ **Reliable**: Last Known Good (LKG) fallback with automatic retry
- ✅ **Observable**: Prometheus metrics + structured JSON logging
- ✅ **Production Ready**: Graceful shutdown, health checks, Docker support

## Quick Start

### Using Docker Compose

```bash
cd apps/backend-snap-exchange
docker-compose up -d
```

### Using Go

```bash
cd apps/backend-snap-exchange
go build -o snapexchange cmd/app/main.go
./snapexchange
```

The service will start on port 8080 (configurable via `APP_PORT` env var).

## API Documentation

### Base URL

```
http://localhost:8080
```

### Endpoints

#### 1. Get All Rates

Returns all available currency exchange rates.

**Request:**

```http
GET /
```

**Response:**

```json
{
  "rates": {
    "EUR": 1.0,
    "USD": 1.082,
    "JPY": 160.58,
    "GBP": 0.8542,
    "CHF": 0.9345
  },
  "base": "EUR",
  "last_updated": "2024-02-15T14:30:00Z"
}
```

**Status Codes:**

- `200 OK`: Rates successfully retrieved
- `503 Service Unavailable`: Rates not loaded yet (initial boot)

---

#### 2. Get Conversion Rate

Calculate conversion rate between two currencies.

**Request:**

```http
GET /{base}?to={target}
```

**Parameters:**

- `base` (path): Base currency code (3 letters, e.g., USD)
- `to` (query): Target currency code (3 letters, e.g., EUR)

**Example:**

```bash
curl http://localhost:8080/USD?to=EUR
```

**Response:**

```json
{
  "from": "USD",
  "to": "EUR",
  "rate": 0.9242,
  "base": "EUR",
  "last_updated": "2024-02-15T14:30:00Z"
}
```

**Status Codes:**

- `200 OK`: Conversion successful
- `400 Bad Request`: Invalid currency code format
- `404 Not Found`: Currency not found in rates
- `503 Service Unavailable`: Rates not loaded yet

---

#### 3. Health Check

Check service health and rate availability.

**Request:**

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "rates_count": 42,
  "last_updated": "2024-02-15T14:30:00Z"
}
```

**Status:**

- `healthy`: Rates are loaded and current
- `degraded`: No rates loaded (service starting or scrape failures)

---

#### 4. Prometheus Metrics

Exposes operational metrics for monitoring.

**Request:**

```http
GET /metrics
```

**Key Metrics:**

- `snapexchange_scrapes_total`: Total ECB scrape attempts
- `snapexchange_scrapes_failed_total`: Failed scrape attempts
- `snapexchange_last_scrape_timestamp`: Unix timestamp of last successful scrape
- `snapexchange_rates_count`: Number of currency rates in store
- `snapexchange_http_requests_total`: HTTP requests by method/status/endpoint
- `snapexchange_http_request_duration_seconds`: Request latency histogram

## Configuration

Environment variables (optional, defaults provided):

```bash
# Server port
APP_PORT=8080

# ECB XML data source
ECB_URL=https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml

# Log level (info, debug, warn, error)
LOG_LEVEL=info
```

Copy `.env.example` to `.env` to customize:

```bash
cp .env.example .env
```

## Refresh Strategy

1. **Boot-time**: Immediate scrape on startup
2. **Hourly**: Automatic refresh every hour
3. **Retry on Failure**: Every 15 minutes until success
4. **Last Known Good**: Never clears working data on scrape failure

## Integration with Spenicle Core

Example integration in transaction service:

```go
func convertToBaseCurrency(amount float64, currency string, baseCurrency string) (float64, float64, error) {
    if currency == baseCurrency {
        return amount, 1.0, nil
    }

    // Call SnapExchange service
    url := fmt.Sprintf("http://snapexchange:8080/%s?to=%s", currency, baseCurrency)
    resp, err := http.Get(url)
    if err != nil {
        return 0, 0, fmt.Errorf("failed to get exchange rate: %w", err)
    }
    defer resp.Body.Close()

    var result struct {
        Rate float64 `json:"rate"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return 0, 0, fmt.Errorf("failed to decode response: %w", err)
    }

    convertedAmount := amount / result.Rate
    return convertedAmount, result.Rate, nil
}
```

## Development

### Quick Start with Docker Compose

```bash
# Start development server with hot reload
docker-compose up

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Local Development

**Build:**

```bash
go build -ldflags="-s -w" -o snapexchange cmd/app/main.go
```

**Run:**

```bash
./snapexchange
```

**Run with hot reload (requires [Air](https://github.com/cosmtrek/air)):**

```bash
# Install Air
go install github.com/cosmtrek/air@latest

# Run with hot reload
air -c .air.toml
```

**Test:**

```bash
# Run all tests
go test ./... -v

# Run with coverage
go test ./... -cover

# Run with race detection
go test ./... -race

# Generate coverage report
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out -o coverage.html
```

**Format & Lint:**

```bash
# Format code
gofmt -w .

# Run vet
go vet ./...

# Check formatting
gofmt -l .
```

## Performance

- **Binary Size**: 8-12 MB (static binary)
- **Memory Footprint**: <10 MB RSS
- **Boot Time**: <500ms
- **Response Time**: <1ms (in-memory lookup)
- **Supported Currencies**: ~40 (ECB provides EUR-based rates)

## Architecture

```
┌─────────────────────────────────────────────────┐
│  HTTP Server (net/http)                         │
│  ├─ GET /                    (all rates)        │
│  ├─ GET /:base?to=:target   (conversion)       │
│  ├─ GET /health              (health check)     │
│  └─ GET /metrics             (Prometheus)       │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  In-Memory Store (map + sync.RWMutex)           │
│  - Thread-safe rate storage                     │
│  - Flush & Replace strategy                     │
│  - Last Known Good fallback                     │
└─────────────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────────────┐
│  Refresh Worker (Background)                    │
│  ├─ Initial scrape on boot                      │
│  ├─ Hourly refresh                              │
│  └─ Retry every 15min on failure                │
└─────────────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────────────┐
│  ECB Scraper (http.Client + encoding/xml)       │
│  - Parses ECB daily XML feed                    │
│  - Validates and normalizes rates               │
└─────────────────────────────────────────────────┘
```

## Project Structure

```
apps/backend-snap-exchange/
├── cmd/
│   └── app/
│       └── main.go              # Entry point, server lifecycle
├── internal/
│   ├── config/
│   │   └── environment.go       # Environment configuration
│   ├── scraper/
│   │   ├── ecb_scraper.go       # HTTP fetch + XML parse
│   │   └── models.go            # XML structs
│   ├── storage/
│   │   └── rate_store.go        # Thread-safe in-memory store
│   ├── worker/
│   │   └── refresh_worker.go    # Hourly refresh + retry logic
│   ├── handlers/
│   │   ├── handlers.go          # HTTP handlers
│   │   └── response.go          # Response models
│   ├── observability/
│   │   ├── logger.go            # slog wrapper
│   │   ├── metrics.go           # Prometheus metrics
│   │   └── id.go                # Request ID generation
│   └── middleware/
│       └── observability.go     # HTTP logging middleware
├── .env.example                 # Example configuration
├── go.mod                       # Go module
├── Dockerfile                   # Container image
├── docker-compose.yml           # Local dev environment
└── README.md                    # This file
```

## Dependencies

Only 2 external dependencies:

- `github.com/joho/godotenv` - .env file loading
- `github.com/prometheus/client_golang` - Prometheus metrics

Everything else uses Go standard library.

## License

Part of the Spenicle personal finance management system.
