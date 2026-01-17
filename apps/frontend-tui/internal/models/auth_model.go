package models

type LoginRequestModel struct {
	Username string
	Password string
}

type LoginResponseModel struct {
	AccessToken  string
	RefreshToken string
}

type RefreshRequestModel struct {
	RefreshToken string
}

type RefreshResponseModel struct {
	AccessToken string
}
