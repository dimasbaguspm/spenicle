package models

type LoginRequestModel struct {
	Username string `json:"username" minLength:"1" required:"true" doc:"Admin username"`
	Password string `json:"password" minLength:"1" required:"true" doc:"Admin password"`
}

type LoginResponseModel struct {
	AccessToken  string `json:"access_token" doc:"Access token valid for 7 days"`
	RefreshToken string `json:"refresh_token" doc:"Refresh token valid for 30 days"`
}

type RefreshRequestModel struct {
	RefreshToken string `json:"refresh_token" minLength:"1" required:"true" doc:"Refresh token"`
}

type RefreshResponseModel struct {
	AccessToken string `json:"access_token" doc:"New access token valid for 7 days"`
}
