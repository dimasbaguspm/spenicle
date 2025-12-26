package main

import (
	"encoding/json"
	"net/http"

	"github.com/dimasbaguspm/spenicle-api/config"
	"github.com/dimasbaguspm/spenicle-api/resource"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

type RoutesConfig struct {
	Router      *chi.Mux
	Environment *config.Environment
}

func (rc *RoutesConfig) Setup() {

	rc.Router = chi.NewRouter()

	// Basic middlewares
	rc.Router.Use(middleware.Logger)
	rc.Router.Use(middleware.Heartbeat("/"))

	// Mount resource routes
	rc.Router.Mount("/accounts", resource.AccountResource{
		Env: rc.Environment,
	}.Routes())

	rc.Router.NotFound(func(w http.ResponseWriter, r *http.Request) {
		encoded, err := json.Marshal(map[string]string{"error": "Resource not found"})
		if err != nil {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}
		http.Error(w, string(encoded), http.StatusNotFound)
	})
}

func (rc *RoutesConfig) GetRouter() *chi.Mux {
	return rc.Router
}

func (rc *RoutesConfig) Run(port string, callback func()) error {
	callback()
	return http.ListenAndServe(port, rc.Router)
}
