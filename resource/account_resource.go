package resource

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/dimasbaguspm/spenicle-api/internal/database/repositories"
	"github.com/dimasbaguspm/spenicle-api/internal/database/schema"
	"github.com/go-chi/chi/v5"
)

type AccountResource struct {
	Store *repositories.AccountRepository
}

// NewAccountResource constructs an AccountResource using the provided repository.
func NewAccountResource(store *repositories.AccountRepository) AccountResource {
	return AccountResource{Store: store}
}

func (ar AccountResource) Routes() chi.Router {
	r := chi.NewRouter()

	r.Get("/", ar.GetPaginated)
	r.Post("/", ar.Create)
	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", ar.GetDetail)
		r.Patch("/", ar.Update)
		r.Delete("/", ar.Delete)
	})

	return r
}

func (ar *AccountResource) GetPaginated(w http.ResponseWriter, r *http.Request) {
	searchParams := schema.SearchParamAccountSchema{}
	searchParams.ParseFromQuery(r.URL.Query())

	parsedResult, err := ar.Store.List(r.Context(), searchParams)
	if err != nil {
		http.Error(w, "Failed to list accounts", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	jsonData, err := parsedResult.ToJSON()
	if err != nil {
		http.Error(w, "Failed to encode accounts to JSON", http.StatusInternalServerError)
		return
	}
	w.Write(jsonData)
}

func (ar *AccountResource) GetDetail(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid account id", http.StatusBadRequest)
		return
	}

	account, err := ar.Store.Get(r.Context(), id)
	if err != nil {
		http.Error(w, "Account not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	data, err := account.ToJSON()
	if err != nil {
		http.Error(w, "Failed to encode account", http.StatusInternalServerError)
		return
	}
	w.Write(data)
}

func (ar *AccountResource) Create(w http.ResponseWriter, r *http.Request) {
	var payload schema.CreateAccountSchema
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	if !payload.IsValid() {
		http.Error(w, "Invalid account data", http.StatusBadRequest)
		return
	}

	account, err := ar.Store.Create(r.Context(), payload)
	if err != nil {
		http.Error(w, "Failed to create account", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	data, err := account.ToJSON()
	if err != nil {
		http.Error(w, "Failed to encode account", http.StatusInternalServerError)
		return
	}
	w.Write(data)
}

func (ar *AccountResource) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid account id", http.StatusBadRequest)
		return
	}

	var payload schema.UpdateAccountSchema
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	if !payload.IsValid() {
		http.Error(w, "Invalid account data", http.StatusBadRequest)
		return
	}
	if !payload.IsChanged(payload) {
		http.Error(w, "No changes provided", http.StatusBadRequest)
		return
	}

	account, err := ar.Store.Update(r.Context(), id, payload)
	if err != nil {
		http.Error(w, "Failed to update account", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	data, err := account.ToJSON()
	if err != nil {
		http.Error(w, "Failed to encode account", http.StatusInternalServerError)
		return
	}
	w.Write(data)
}

func (ar *AccountResource) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid account id", http.StatusBadRequest)
		return
	}

	if err := ar.Store.Delete(r.Context(), id); err != nil {
		http.Error(w, "Failed to delete account", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
