package models

type App struct {
	Page    Page
	Session *LoginResponseModel
}

type Page struct {
	ID   string
	Name string
	Path string
}
