# Authentication Guide

## Overview

This document describes the authentication and authorization patterns used in the Spenicle API, including JWT token-based authentication, public vs protected routes, and implementation details.

## Authentication Strategy

### JWT Token-Based Authentication

The API uses JSON Web Tokens (JWT) for stateless authentication:

- **Access Tokens**: Short-lived tokens (7 days) for API access
- **Refresh Tokens**: Long-lived tokens (30 days) for obtaining new access tokens
- **Signing**: All tokens are signed with `JWT_SECRET` from environment variables
- **Claims**: Tokens use subject claims to differentiate token types (`"access"` vs `"refresh"`)

### Security Features

- **Constant-time comparison**: Credentials validated using `crypto/subtle.ConstantTimeCompare` to prevent timing attacks
- **Single admin user**: Configured via environment variables (no database authentication yet)
- **Token rotation**: Refresh tokens allow obtaining new access tokens without re-authentication
- **Subject claim validation**: Ensures refresh tokens cannot be used as access tokens

## Route Types

### Public Routes

Public routes are accessible without authentication. These include:

- **`POST /auth/login`** - Authenticate and receive access + refresh tokens
- **`POST /auth/refresh`** - Get new access token using refresh token
- **`GET /docs`** - OpenAPI documentation UI (Swagger)
- **`GET /openapi.json`** - OpenAPI specification
- **`GET /openapi.yaml`** - OpenAPI specification (YAML format)
- **`GET /health`** - Health check endpoint

**Implementation Pattern:**

```go
// Public routes registered on main router
publicApi := humachi.New(rc.router, config)
resources.NewAuthResource(env).RegisterRoutes(publicApi)
```

### Protected Routes

Protected routes require a valid JWT access token in the `Authorization` header:

- **All `/accounts` endpoints** - CRUD operations for accounts

**Authentication Header Format:**

```
Authorization: Bearer <access_token>
```

**Implementation Pattern:**

```go
// Protected routes wrapped with authentication middleware
rc.router.Route("/", func(r chi.Router) {
    r.Use(func(h http.Handler) http.Handler {
        return internalmiddleware.RequireAuth(env, h)
    })
    protectedApi := humachi.New(r, config)
    resources.NewAccountResource(accountService).RegisterRoutes(protectedApi)
})
```

## Authentication Flow

### 1. Login Flow

```
Client                          Server
  |                               |
  |  POST /auth/login             |
  |  { username, password }       |
  |------------------------------>|
  |                               | Validate credentials
  |                               | Generate access + refresh tokens
  |  200 OK                       |
  |  { access_token,              |
  |    refresh_token }            |
  |<------------------------------|
  |                               |
```

**Request:**

```json
POST /auth/login
{
  "username": "admin",
  "password": "secure-password"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 2. Accessing Protected Resources

```
Client                          Server
  |                               |
  |  GET /accounts                |
  |  Authorization: Bearer <token>|
  |------------------------------>|
  |                               | Validate access token
  |                               | Check signature & expiration
  |  200 OK                       |
  |  { accounts: [...] }          |
  |<------------------------------|
  |                               |
```

### 3. Token Refresh Flow

```
Client                          Server
  |                               |
  |  POST /auth/refresh           |
  |  { refresh_token }            |
  |------------------------------>|
  |                               | Validate refresh token
  |                               | Check subject claim = "refresh"
  |  200 OK                       |
  |  { access_token }             |
  |<------------------------------|
  |                               |
```

**Request:**

```json
POST /auth/refresh
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Implementation Details

### Middleware Functions

Located in `internal/middleware/auth_middleware.go`:

#### `RequireAuth(env, next) http.Handler`

Chi-compatible middleware that validates JWT access tokens.

**Behavior:**

- Extracts token from `Authorization: Bearer <token>` header
- Validates token signature using `JWT_SECRET`
- Checks token expiration
- Returns 401 if token is missing, invalid, or expired
- Calls `next` handler if token is valid

**Usage:**

```go
r.Use(func(h http.Handler) http.Handler {
    return middleware.RequireAuth(env, h)
})
```

#### `GenerateToken(env, loginRequest) (accessToken, refreshToken, error)`

Creates both access and refresh tokens for valid credentials.

**Features:**

- Constant-time credential comparison (prevents timing attacks)
- Generates access token with 7-day expiration and subject "access"
- Generates refresh token with 30-day expiration and subject "refresh"
- Returns `ErrInvalidCredentials` if username or password doesn't match

**Usage:**

```go
accessToken, refreshToken, err := middleware.GenerateToken(env, loginRequest)
if err != nil {
    return nil, huma.Error401Unauthorized("invalid credentials")
}
```

#### `GenerateAccessToken(env, refreshRequest) (accessToken, error)`

Creates a new access token from a valid refresh token.

**Features:**

- Validates refresh token signature and expiration
- Checks subject claim is "refresh"
- Generates new 7-day access token with subject "access"
- Returns error if refresh token is invalid

**Usage:**

```go
accessToken, err := middleware.GenerateAccessToken(env, refreshRequest)
if err != nil {
    return nil, huma.Error401Unauthorized("invalid refresh token")
}
```

### Request/Response Models

Defined in `internal/middleware/auth_middleware.go` and reused in `internal/resources/auth_resource.go`:

```go
type LoginRequestModel struct {
    Username string `json:"username" minLength:"1" doc:"Admin username"`
    Password string `json:"password" minLength:"1" doc:"Admin password"`
}

type LoginResponseModel struct {
    AccessToken  string `json:"access_token" doc:"Access token valid for 7 days"`
    RefreshToken string `json:"refresh_token" doc:"Refresh token valid for 30 days"`
}

type RefreshRequestModel struct {
    RefreshToken string `json:"refresh_token" minLength:"1" doc:"Refresh token"`
}

type RefreshResponseModel struct {
    AccessToken string `json:"access_token" doc:"New access token valid for 7 days"`
}
```

### Auth Resource

Located in `internal/resources/auth_resource.go`:

**Responsibilities:**

- Handle HTTP requests for `/auth/login` and `/auth/refresh`
- Call middleware functions for token generation
- Return appropriate HTTP status codes and error messages
- No business logic (delegates to middleware functions)

**Pattern:**

```go
func (ar *AuthResource) Login(ctx context.Context, input *loginRequestBody) (*loginResponseBody, error) {
    accessToken, refreshToken, err := middleware.GenerateToken(ar.env, input.Body)
    if err != nil {
        return nil, huma.Error401Unauthorized("invalid credentials")
    }

    resp := &loginResponseBody{}
    resp.Body.AccessToken = accessToken
    resp.Body.RefreshToken = refreshToken
    return resp, nil
}
```

## OpenAPI Documentation

### Security Scheme Definition

Security schemes are defined at the API config level in `handlers.go`:

```go
config.Components.SecuritySchemes = map[string]*huma.SecurityScheme{
    "bearer": {Type: "http", Scheme: "bearer", BearerFormat: "JWT"},
}
```

### Endpoint Security Declaration

Protected endpoints declare security requirements in their `huma.Operation`:

```go
huma.Register(api, huma.Operation{
    OperationID: "list-accounts",
    Method:      http.MethodGet,
    Path:        "/accounts",
    Summary:     "List accounts",
    Tags:        []string{"Accounts"},
    Security: []map[string][]string{
        {"bearer": {}},
    },
}, ar.GetPaginated)
```

This adds a lock icon to the endpoint in the Swagger UI and allows users to authenticate via the "Authorize" button.

## Configuration

### Environment Variables

Required authentication-related environment variables in `.env`:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production-min-32-chars

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password-change-this-in-production
```

### Security Best Practices

1. **JWT_SECRET**: Use a strong random string (minimum 32 characters)
2. **Credentials**: Never commit actual credentials to version control
3. **Production**: Rotate secrets regularly
4. **HTTPS**: Always use HTTPS in production to protect tokens in transit
5. **Token Storage**: Client should store tokens securely (httpOnly cookies or secure storage)

## Error Responses

### 401 Unauthorized

Returned when authentication fails:

```json
{
  "title": "Unauthorized",
  "status": 401,
  "detail": "invalid credentials"
}
```

**Common causes:**

- Missing `Authorization` header
- Invalid or expired access token
- Invalid refresh token
- Incorrect username or password

### 400 Bad Request

Returned for validation errors:

```json
{
  "title": "Bad Request",
  "status": 400,
  "detail": "validation failed",
  "errors": [
    {
      "location": "body.username",
      "message": "minLength failed",
      "value": ""
    }
  ]
}
```

## Adding Authentication to New Endpoints

### Step 1: Decide Route Type

- **Public**: Authentication endpoints, documentation, health checks
- **Protected**: Business logic endpoints requiring user authentication

### Step 2: Register Routes

**For Public Routes:**

```go
// Register on main publicApi
publicApi := humachi.New(rc.router, config)
resource.RegisterRoutes(publicApi)
```

**For Protected Routes:**

```go
// Register inside protected route group
rc.router.Route("/", func(r chi.Router) {
    r.Use(func(h http.Handler) http.Handler {
        return middleware.RequireAuth(env, h)
    })
    protectedApi := humachi.New(r, config)
    resource.RegisterRoutes(protectedApi)
})
```

### Step 3: Add Security to OpenAPI Operation

For protected endpoints, add the Security field:

```go
huma.Register(api, huma.Operation{
    OperationID: "my-operation",
    Method:      http.MethodGet,
    Path:        "/my-endpoint",
    Summary:     "My endpoint",
    Tags:        []string{"MyResource"},
    Security: []map[string][]string{
        {"bearer": {}},  // Requires JWT bearer token
    },
}, handler)
```

### Step 4: Test Authentication

1. **Test without token**: Should return 401
2. **Test with invalid token**: Should return 401
3. **Test with valid token**: Should return expected response
4. **Test with expired token**: Should return 401

## Future Enhancements

Potential improvements to the authentication system:

1. **Database-backed users**: Move from environment-based single admin to database users
2. **Role-based access control**: Add roles and permissions
3. **Token blacklisting**: Implement token revocation
4. **Rate limiting**: Add login attempt rate limiting
5. **Password hashing**: Use bcrypt/argon2 when moving to database users
6. **Audit logging**: Track authentication events
7. **Multi-factor authentication**: Add 2FA support
8. **OAuth2**: Support third-party authentication providers

## Troubleshooting

### "unauthorized" error on protected endpoints

**Check:**

1. Token included in `Authorization: Bearer <token>` header?
2. Token format correct (no extra spaces, "Bearer " prefix)?
3. Token not expired (check `exp` claim)?
4. JWT_SECRET matches between token generation and validation?

**Debug:**

```bash
# Decode JWT to inspect claims (don't do this with real tokens!)
echo "eyJhbGc..." | base64 -d
```

### "invalid credentials" on login

**Check:**

1. `ADMIN_USERNAME` and `ADMIN_PASSWORD` set correctly in `.env`?
2. Environment variables loaded (`configs.LoadEnvironment()` called)?
3. Request body format correct (`{"username": "...", "password": "..."}`)?

### Documentation endpoints returning 401

**Check:**

1. Docs routes registered on `publicApi` (not `protectedApi`)?
2. Auth middleware not applied to root `/` before docs registration?
3. `humachi.New()` called on main router for public API?

### Tokens not validating

**Check:**

1. Same `JWT_SECRET` used for signing and validation?
2. Token not expired (check current time vs `exp` claim)?
3. Subject claim matches expected type ("access" or "refresh")?
4. Token signature algorithm is HS256?
