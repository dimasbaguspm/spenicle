# Middlewares

Middlewares are HTTP request interceptors that run before handlers. They modify context, headers, or reject requests.

## Middleware Registration

Middlewares are registered in `handlers.go` in `RegisterMiddlewares()` and `RegisterPrivateRoutes()`:

```go
func RegisterMiddlewares(ctx context.Context, huma huma.API) {
    huma.UseMiddleware(internalmiddleware.CORS(huma))  // Applied to all routes
}

func RegisterPrivateRoutes(ctx context.Context, huma huma.API, pool *pgxpool.Pool) {
    huma.UseMiddleware(internalmiddleware.SessionMiddleware(huma))  // Applied to private routes only
    // ... register resources
}
```

**Execution Order:**

1. Global middleware (CORS)
2. Route-specific middleware (Session)
3. Handler execution

## CORS Middleware

**File:** `internal/middleware/cors_middleware.go`

**Purpose:** Validate origin and enable cross-origin requests from web frontend

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

## Session Middleware

**File:** `internal/middleware/session_middleware.go`

**Purpose:** Validate JWT token and ensure authentication for protected routes

**Applied to:** All routes under `RegisterPrivateRoutes()` scope

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

## Middleware Chain Example

```
Request arrives
├─ CORS Middleware
│  ├─ Check origin
│  ├─ If invalid origin: return 204 (preflight) or continue with headers
│  └─ Continue to next
│
├─ SessionMiddleware (if private route)
│  ├─ Extract Bearer token
│  ├─ Validate JWT
│  ├─ If invalid: return 401 Unauthorized
│  └─ Continue if valid
│
└─ Route Handler
   ├─ Parse request body/query params
   ├─ Call service
   ├─ Return response
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

## Best Practices

1. **Middleware should be stateless** - Don't store request state in middleware
2. **Order matters** - CORS before Session (validate origin before checking auth)
3. **Keep middlewares focused** - One responsibility per middleware
4. **Error responses** - Use appropriate HTTP status codes
5. **Logging** - Consider adding logging middleware for debugging
6. **Token expiration** - Implement refresh token flow for long-lived sessions

## Future Enhancements

1. Fix preflight request handling (return 204 properly)
2. Add rate limiting middleware
3. Add request logging/tracing middleware
4. Add request body size limiting middleware
5. Add panic recovery middleware
6. Implement refresh token mechanism
