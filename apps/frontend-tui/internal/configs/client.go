package configs

import (
	"net/http"
	"time"
)

func NewHttpClient(baseURL string) http.Client {
	return http.Client{
		Timeout: 10 * time.Second,
	}
}
