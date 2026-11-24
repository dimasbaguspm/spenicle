// Package google is the OAuth2 adapter for Google: it owns the endpoints, the wire
// format and the scope list, and answers with the connections module's vocabulary.
package google

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/module/connections"
)

const (
	DefaultAuthorizeEndpoint = "https://accounts.google.com/o/oauth2/v2/auth"
	//nolint:gosec // G101: a public endpoint URL, not a credential
	DefaultTokenEndpoint  = "https://oauth2.googleapis.com/token"
	DefaultRevokeEndpoint = "https://oauth2.googleapis.com/revoke"

	gmailReadOnlyScope = "https://www.googleapis.com/auth/gmail.readonly"

	maxBodyBytes   = 1 << 20
	invalidGrant   = "invalid_grant"
	requestTimeout = 15 * time.Second
)

type Client struct {
	http      *http.Client
	authorize string
	token     string
	revoke    string
	scopes    []string
}

// New builds the adapter; an empty endpoint keeps the production default, which is how
// tests point it at a local server without adding an environment variable.
func New(httpClient *http.Client, authorize, token, revoke string) *Client {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: requestTimeout}
	}

	return &Client{
		http:      httpClient,
		authorize: fallback(authorize, DefaultAuthorizeEndpoint),
		token:     fallback(token, DefaultTokenEndpoint),
		revoke:    fallback(revoke, DefaultRevokeEndpoint),
		scopes:    []string{"openid", "email", gmailReadOnlyScope},
	}
}

var _ connections.Authorizer = (*Client)(nil)

func (c *Client) Name() string { return constant.ProviderGoogle }

func (c *Client) Scopes() []string { return append([]string{}, c.scopes...) }

func (c *Client) Authorize(params connections.AuthorizeParams) string {
	query := url.Values{
		"client_id":              {params.ClientID},
		"redirect_uri":           {params.RedirectURL},
		"response_type":          {"code"},
		"scope":                  {strings.Join(params.Scopes, " ")},
		"state":                  {params.State},
		"access_type":            {"offline"},
		"prompt":                 {"consent"},
		"include_granted_scopes": {"true"},
	}

	return c.authorize + "?" + query.Encode()
}

func (c *Client) Exchange(
	ctx context.Context,
	params connections.ExchangeParams,
) (connections.Grant, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Oauth.Google.Exchange")
	defer endSpan()

	return c.post(ctx, url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {params.Code},
		"client_id":     {params.ClientID},
		"client_secret": {params.ClientSecret},
		"redirect_uri":  {params.RedirectURL},
	})
}

func (c *Client) Refresh(
	ctx context.Context,
	params connections.RefreshParams,
) (connections.Grant, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Oauth.Google.Refresh")
	defer endSpan()

	return c.post(ctx, url.Values{
		"grant_type":    {"refresh_token"},
		"refresh_token": {params.RefreshToken},
		"client_id":     {params.ClientID},
		"client_secret": {params.ClientSecret},
	})
}

func (c *Client) Revoke(ctx context.Context, token string) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Oauth.Google.Revoke")
	defer endSpan()

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, c.revoke,
		strings.NewReader(url.Values{"token": {token}}.Encode()))
	if err != nil {
		return fmt.Errorf("revoke request: %w", err)
	}

	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	response, err := c.http.Do(request)
	if err != nil {
		return fmt.Errorf("revoke: %w", err)
	}

	defer func() { _ = response.Body.Close() }()

	_, _ = io.Copy(io.Discard, response.Body)

	if response.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("revoke: provider answered %d", response.StatusCode)
	}

	return nil
}

func (c *Client) post(ctx context.Context, form url.Values) (connections.Grant, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, c.token,
		strings.NewReader(form.Encode()))
	if err != nil {
		return connections.Grant{}, fmt.Errorf("token request: %w", err)
	}

	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	response, err := c.http.Do(request)
	if err != nil {
		return connections.Grant{}, fmt.Errorf("token call: %w", err)
	}

	defer func() { _ = response.Body.Close() }()

	var payload tokenResponse
	if err := json.NewDecoder(io.LimitReader(response.Body, maxBodyBytes)).Decode(&payload); err != nil {
		return connections.Grant{}, fmt.Errorf("token answer: %w", err)
	}

	if payload.Error != "" {
		if payload.Error == invalidGrant {
			return connections.Grant{}, connections.ErrReauthRequired
		}

		return connections.Grant{}, fmt.Errorf("%w: %s", connections.ErrProviderFailed,
			strings.TrimSpace(payload.Error+": "+payload.ErrorDescription))
	}

	if payload.AccessToken == "" {
		return connections.Grant{}, fmt.Errorf("%w: no access token", connections.ErrProviderFailed)
	}

	claims, claimsErr := parseIDToken(payload.IDToken)
	if claimsErr != nil && payload.IDToken != "" {
		return connections.Grant{}, claimsErr
	}

	return connections.Grant{
		AccessToken:  payload.AccessToken,
		RefreshToken: payload.RefreshToken,
		Scopes:       strings.Fields(payload.Scope),
		Sub:          claims.Sub,
		Account:      claims.Email,
		ExpiresIn:    time.Duration(payload.ExpiresIn) * time.Second,
	}, nil
}

type tokenResponse struct {
	AccessToken      string `json:"access_token"`
	RefreshToken     string `json:"refresh_token"`
	ExpiresIn        int64  `json:"expires_in"`
	Scope            string `json:"scope"`
	IDToken          string `json:"id_token"`
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description"`
}
type idClaims struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
}

// parseIDToken reads the claims out of the answer to a request this process made to the
// token endpoint over TLS with its own client secret, so the payload is trusted as-is:
// verification would only re-prove what the transport already proved.
func parseIDToken(raw string) (idClaims, error) {
	if raw == "" {
		return idClaims{}, nil
	}

	parts := strings.Split(raw, ".")
	if len(parts) != 3 {
		return idClaims{}, errors.New("id_token is not a JWT")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return idClaims{}, fmt.Errorf("id_token payload: %w", err)
	}

	var claims idClaims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return idClaims{}, fmt.Errorf("id_token claims: %w", err)
	}

	return claims, nil
}

func fallback(value, preset string) string {
	if strings.TrimSpace(value) == "" {
		return preset
	}

	return value
}
