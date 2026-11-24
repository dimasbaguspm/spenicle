package main

import (
	"encoding/base64"
	"net/http"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
)

const (
	googleAccessToken  = "google-access-token"
	googleRefreshToken = "google-refresh-token"
	googleScope        = "openid email https://www.googleapis.com/auth/gmail.readonly"
	googleLifetime     = 3599

	googleClaims = `{"sub":"google-sub-1","email":"mailbox@example.com"}`
)

type googleToken struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
	IDToken      string `json:"id_token"`
}

func registerGoogle(mux *http.ServeMux) {
	mux.HandleFunc("POST /oauth/token", func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, googleToken{
			AccessToken:  googleAccessToken,
			RefreshToken: googleRefreshToken,
			ExpiresIn:    googleLifetime,
			Scope:        googleScope,
			IDToken:      googleIDToken(),
		})
	})

	mux.HandleFunc("POST /oauth/token/down", handleDown)

	mux.HandleFunc("POST /oauth/token/garbage", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", jsonType)
		_, _ = w.Write([]byte(`{"access_token":`))
	})

	mux.HandleFunc("POST /oauth/revoke", func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]string{})
	})
}

// googleIDToken carries the claims the adapter reads, without a signature: the adapter
// trusts the answer to its own authenticated call, which is exactly what this stands in for.
func googleIDToken() string {
	return "header." + base64.RawURLEncoding.EncodeToString([]byte(googleClaims)) + ".signature"
}
