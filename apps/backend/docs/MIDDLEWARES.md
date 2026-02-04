# Middlewares

Middlewares are HTTP request interceptors that run before handlers. They modify context, headers, or reject requests.

## Middleware Registration

Middlewares are applied at two levels:

1. **Server level** (wraps entire HTTP server in `main.go:42`):
   ```go
   srv := &http.Server{
       Handler: middleware.RateLimitMiddleware(env, rdb)(
           middleware.ObservabilityMiddleware(
               middleware.CORS(svr)
           )
       ),
   }
   ```

2. **Route scope level** (applied in `RegisterPrivateRoutes()` via Huma):
   ```go
   func RegisterPrivateRoutes(ctx context.Context, huma huma.API, db *pgxpool.Pool, rdb *redis.Client) {
       huma.UseMiddleware(middleware.SessionMiddleware(huma))  // Private routes only
       // ... register resources
   }
   ```

**Execution Order (4 layers):**

1. ObservabilityMiddleware (logging, metrics, request ID)
2. RateLimitMiddleware (Redis-based, production only)
3. CORS Middleware (origin validation)
4. SessionMiddleware (JWT auth, private routes only)
5. Handler execution

## 1. ObservabilityMiddleware

**File:** `internal/middleware/observability_middleware.go`

**Purpose:** Request tracing, structured logging, and Prometheus metrics collection

**Applied to:** All routes (server level)

### Features

1. **Request ID Generation**
   - Unique ID per request via `observability.GenerateID()`
   - Stored in context: `context.WithValue(ctx, observability.RequestIDKey, requestID)`
   - Logged with every request start/completion

2. **Structured Logging**
   - Uses Go's `log/slog` with JSON format
   - Request start log includes: request_id, method, url, remote_addr
   - Completion log adds: duration_ms, status

3. **Prometheus Metrics**
   - `requests_total{method, status, path}` (counter)
   - `request_duration_seconds{method, path}` (histogram)
   - `last_request_time{method, path}` (gauge, Unix timestamp)
   - `http_errors_total{status, method, path}` (counter, 4xx and 5xx only)

4. **Response Wrapping**
   - Custom `responseWriter` struct captures status code
   - Default status 200 if handler doesn't set explicitly

### Example Logs

```json
{"time":"2024-01-04T10:15:30Z","level":"INFO","msg":"Incoming request","request_id":"abc123","method":"GET","url":"/accounts","remote_addr":"127.0.0.1:54321"}
{"time":"2024-01-04T10:15:30Z","level":"INFO","msg":"Request completed","request_id":"abc123","duration_ms":45,"status":200}
```

### Integration

Access request ID in handlers:
```go
requestID := r.Context().Value(observability.RequestIDKey).(string)
```

---

## 2. RateLimitMiddleware

**File:** `internal/middleware/rate_limiter_middleware.go`

**Purpose:** Prevent abuse by limiting requests per IP address

**Applied to:** All routes (server level), **production only**

### Configuration

```go
const (
    RateLimitRequests  = 100         // requests per window
    RateLimitWindow    = time.Minute // time window
    RateLimitKeyPrefix = "rate_limit:"
)
```

### Algorithm: Sliding Window

Uses Redis INCR with EXPIRE for atomic sliding window:

```go
func (rl *RateLimiter) IsAllowed(ctx context.Context, key string) (bool, int, time.Duration, error) {
    now := time.Now()
    windowStart := now.Truncate(RateLimitWindow)

    redisKey := fmt.Sprintf("%srate_limit:%s:%s", RateLimitKeyPrefix, key, windowStart.Format("2006-01-02T15:04"))

    count, _ := rl.rdb.Incr(ctx, redisKey).Result()

    if count == 1 {
        rl.rdb.Expire(ctx, redisKey, RateLimitWindow)
    }

    return count <= RateLimitRequests, int(count), resetDuration, nil
}
```

### Behavior

**When allowed (count ≤ 100):**
- Sets response headers:
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: N`
  - `X-RateLimit-Reset: N` (seconds)
- Continues to next middleware

**When exceeded (count > 100):**
- Returns HTTP 429 Too Many Requests
- Sets headers:
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 0`
  - `X-RateLimit-Reset: N`
  - `Retry-After: N`
- Logs warning with client IP, count, reset time

**Development mode:**
- Completely bypassed when `env.AppStage != configs.AppStageProd`
- No rate limiting applied in development

### Redis Key Pattern

```
rate_limit:rate_limit:127.0.0.1:2024-01-04T10:15
```

Keys auto-expire after 1 minute.

---

## 3. CORS Middleware

**File:** `internal/middleware/cors_middleware.go`

**Purpose:** Validate origin and enable cross-origin requests from web frontend

**Applied to:** All routes (server level)

**Configuration:**

```go
allowedOrigins = []string{"http://localhost:3000"}
allowedMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
allowedHeaders = []string{"Content-Type", "Authorization"}
```

### Behavior

**For regular requests (GET, POST, etc.):**

1. Extract `Origin` header from request
2. Validate against allowlist
3. If valid:
   - Set `Access-Control-Allow-Origin: {origin}`
   - Set `Access-Control-Allow-Methods`
   - Set `Access-Control-Allow-Headers`
   - Set `Access-Control-Allow-Credentials: true`
4. Continue to next middleware/handler

**For preflight requests (OPTIONS):**

1. Check if method is OPTIONS
2. Return 204 No Content
3. Note: Current implementation returns error for preflight, should be fixed to return 204 with headers

**Example Request/Response:**

```
Request:
GET /accounts HTTP/1.1
Origin: http://localhost:3000
Authorization: Bearer {token}

Response:
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### Security Notes

- Only allows specific origin (whitelist approach)
- Credentials enabled (allows cookies/auth headers)
- Methods restricted to needed operations
- Headers restricted to necessary ones

---

## 4. SessionMiddleware

**File:** `internal/middleware/session_middleware.go`

**Purpose:** Validate JWT token and ensure authentication for protected routes

**Applied to:** Private routes only (via `huma.UseMiddleware()` in `RegisterPrivateRoutes()` scope)

### Behavior

1. Extract `Authorization` header
2. Parse Bearer token:
   ```go
   if len(atk) > 7 && atk[:7] == "Bearer " {
       atk = atk[7:]  // Remove "Bearer " prefix
   }
   ```
3. Validate token via `AuthRepository.ParseToken()`
   - Verifies JWT signature
   - Checks token expiration
   - Extracts user claims
4. If invalid/missing:
   - Return HTTP 401 Unauthorized
   - Message: "Invalid or missed auth token"
5. If valid:
   - Continue to next middleware/handler
   - Token claims available in context

**Token Format:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.{payload}.{signature}
```

**Example Request/Response:**

```
Request (Valid Token):
GET /accounts HTTP/1.1
Authorization: Bearer {valid_jwt_token}

Response:
HTTP/1.1 200 OK
[Handler processes request]

---

Request (Missing/Invalid Token):
GET /accounts HTTP/1.1

Response:
HTTP/1.1 401 Unauthorized
{
  "status": 401,
  "message": "Invalid or missed auth token"
}
```

### Token Validation Logic

Located in `AuthRepository.ParseToken()`:

```go
func (ar AuthRepository) ParseToken(tokenString string) (*AuthModel, error) {
    // 1. Parse JWT string
    // 2. Verify signature using secret key
    // 3. Check if token expired
    // 4. Extract claims (user ID, etc.)
    // 5. Return parsed token or error
}
```

**Token Generation Flow:**

- User calls `POST /auth/login` with credentials
- `AuthService.Login()` validates username/password
- Generates JWT token with:
  - `exp`: expiration time (usually 24h from now)
  - `sub`: user ID
  - Other claims
- Returns token to client

**Client Usage:**

- Client stores token (localStorage, cookie, etc.)
- Includes in every request: `Authorization: Bearer {token}`
- Server validates in SessionMiddleware

---

## Middleware Chain Example

### Full Request Flow

```
Request arrives at HTTP server
├─ ObservabilityMiddleware (Layer 1)
│  ├─ Generate request ID (e.g., "abc123")
│  ├─ Add to context: ctx = context.WithValue(ctx, RequestIDKey, "abc123")
│  ├─ Log: "Incoming request" {request_id, method, url, remote_addr}
│  ├─ Start timer for metrics
│  └─ Continue to next →
│
├─ RateLimitMiddleware (Layer 2, production only)
│  ├─ Extract client IP from r.RemoteAddr
│  ├─ Build Redis key: "rate_limit:127.0.0.1:2024-01-04T10:15"
│  ├─ INCR counter in Redis (atomic)
│  ├─ If count == 1: SET EXPIRE 1 minute
│  ├─ If count > 100:
│  │  ├─ Set X-RateLimit-* headers
│  │  ├─ Return HTTP 429 Too Many Requests
│  │  └─ Stop (don't continue)
│  ├─ Else: Set X-RateLimit-* headers
│  └─ Continue to next →
│
├─ CORS Middleware (Layer 3)
│  ├─ Extract Origin header
│  ├─ Check against allowlist: ["http://localhost:3000"]
│  ├─ If valid: Set Access-Control-* headers
│  ├─ If OPTIONS (preflight): Return 204
│  └─ Continue to next →
│
├─ SessionMiddleware (Layer 4, private routes only)
│  ├─ Extract Authorization header
│  ├─ Parse "Bearer {token}"
│  ├─ Call AuthRepository.ParseToken(token)
│  ├─ Verify JWT signature + expiration
│  ├─ If invalid/missing:
│  │  ├─ Return HTTP 401 Unauthorized
│  │  └─ Stop (don't continue)
│  ├─ Extract user claims from token
│  └─ Continue to next →
│
└─ Route Handler (Resource Layer)
   ├─ Huma validates request schema
   ├─ Parse request body/query params
   ├─ Call service method
   │  ├─ Check cache (Redis)
   │  ├─ On cache miss: Query repository (PostgreSQL)
   │  ├─ On mutation: Invalidate affected caches
   │  └─ Return response
   ├─ Return HTTP response
   │
   ← Back to ObservabilityMiddleware
      ├─ Calculate duration
      ├─ Record Prometheus metrics:
      │  ├─ requests_total{method="GET", status="200", path="/accounts"}++
      │  ├─ request_duration_seconds{method="GET", path="/accounts"}.Observe(0.045)
      │  ├─ last_request_time{method="GET", path="/accounts"} = now
      │  ├─ (if status >= 400) http_errors_total{status, method, path}++
      ├─ Log: "Request completed" {request_id, duration_ms, status}
      └─ Return to client
```

## Public vs Private Routes

**Public Routes (Auth):**

- No SessionMiddleware
- Accessible without token
- Examples: `/auth/login`, `/auth/signup`, `/auth/logout`

**Private Routes:**

- SessionMiddleware applied
- Requires valid JWT token
- Examples: `/accounts`, `/transactions`, `/budgets`, etc.

---

## Summary Table

| Middleware | Level | Applied To | Key Features | Production Only |
|-----------|-------|-----------|--------------|-----------------|
| **ObservabilityMiddleware** | Server | All routes | Request ID, logging, Prometheus metrics | No |
| **RateLimitMiddleware** | Server | All routes | 100 req/min per IP, Redis sliding window | **Yes** |
| **CORS** | Server | All routes | Origin validation, Access-Control headers | No |
| **SessionMiddleware** | Huma scope | Private routes | JWT validation, HTTP 401 on invalid | No |

---

## Best Practices

1. **Middleware should be stateless** - Don't store request state in middleware
2. **Order matters** - Observability first (for logging), then RateLimit, then CORS, then Session
3. **Keep middlewares focused** - One responsibility per middleware
4. **Error responses** - Use appropriate HTTP status codes (401, 429, etc.)
5. **Context usage** - Pass data via context.WithValue (e.g., request ID)
6. **Prometheus labels** - Keep label cardinality low (avoid user IDs in labels)
7. **Rate limiting** - Only in production to avoid disrupting development
8. **Logging** - Use structured logging (slog) with consistent fields

---

## Monitoring

### Prometheus Metrics Endpoint

Visit `/metrics` to see all metrics:

```
# HELP requests_total Total number of HTTP requests
# TYPE requests_total counter
requests_total{method="GET",path="/accounts",status="200"} 1247

# HELP request_duration_seconds HTTP request duration
# TYPE request_duration_seconds histogram
request_duration_seconds_bucket{method="GET",path="/accounts",le="0.05"} 980
request_duration_seconds_bucket{method="GET",path="/accounts",le="0.1"} 1200
...

# HELP cache_hits_total Total cache hits
# TYPE cache_hits_total counter
cache_hits_total{resource="accounts"} 523

# HELP cache_misses_total Total cache misses
# TYPE cache_misses_total counter
cache_misses_total{resource="accounts"} 124
```

### Structured Logs

All requests logged with consistent format:

```json
{"time":"2024-01-04T10:15:30Z","level":"INFO","msg":"Incoming request","request_id":"abc123","method":"GET","url":"/accounts","remote_addr":"127.0.0.1:54321"}
{"time":"2024-01-04T10:15:30Z","level":"INFO","msg":"Request completed","request_id":"abc123","duration_ms":45,"status":200}
{"time":"2024-01-04T10:15:31Z","level":"WARN","msg":"rate_limit_exceeded","client_ip":"127.0.0.1","count":101,"reset_in":"45s"}
```
