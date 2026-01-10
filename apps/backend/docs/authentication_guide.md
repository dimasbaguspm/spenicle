# Authentication — Summary

Overview: JWT-based authentication with short-lived access tokens (7d) and refresh tokens (30d). Tokens are signed with `JWT_SECRET`.

Key points

- Access token: 7 days (Bearer header)
- Refresh token: 30 days (used to obtain new access tokens)
- Credentials: currently a single admin user configured via env vars (`ADMIN_USERNAME`, `ADMIN_PASSWORD`)

Routes

- Public: `POST /auth/login`, `POST /auth/refresh`, `GET /docs`, `GET /openapi.json`, `GET /health`
- Protected: application routes (e.g., `/accounts/*`) — require `Authorization: Bearer <token>`

Implementation notes

- Middleware: `internal/middleware/auth_middleware.go` provides `RequireAuth`, `GenerateToken`, and `GenerateAccessToken`.
- Tokens must validate signature, expiration, and subject claim (`access` vs `refresh`).
- Use `RequireAuth` when registering protected routes; declare security in Huma operations to show lock in OpenAPI.

Env (minimum)

- `JWT_SECRET` (strong, >=32 chars)
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`

Quick examples

```bash
# Login -> get tokens
curl -X POST -d '{"username":"admin","password":"pass"}' http://localhost:8080/auth/login

# Use access token
curl -H "Authorization: Bearer <access_token>" http://localhost:8080/accounts
```

Errors

- 401: missing/invalid/expired token or invalid credentials
- 400: validation errors on auth request

See `internal/middleware/auth_middleware.go` and `internal/resources/auth_resource.go` for implementation.

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

1. `ADMIN_USERNAME` and `ADMIN_PASSWORD` set correctly in the compose environment
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
