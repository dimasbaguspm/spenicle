package models

import (
	"time"
)

const DefaultTimeout = 30 * time.Second

type App struct {
	Page    *Page
	Drawer  *Drawer
	Session *LoginResponseModel
}

type Page struct {
	ID   string
	Name string
	Path string
}

type Drawer struct {
	ID     string
	Name   string
	Dialog interface{}
}
