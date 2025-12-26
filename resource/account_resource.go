package resource

import (
	"net/http"

	"github.com/dimasbaguspm/spenicle-api/config"
	"github.com/dimasbaguspm/spenicle-api/internal/database"
	"github.com/dimasbaguspm/spenicle-api/internal/database/schema"
	"github.com/go-chi/chi/v5"
)

type AccountResource struct {
	Env *config.Environment
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
	db := database.Database{Env: ar.Env}

	db.Connect()
	defer db.Close()

	searchParams := schema.SearchParamAccountSchema{}
	searchParams.ParseFromQuery(r.URL.Query())

	sql := "SELECT id, name, type, note, amount, created_at, updated_at, deleted_at FROM accounts LIMIT $1 OFFSET $2"

	rows, err := db.Conn.Query(r.Context(), sql, searchParams.PageSize, (searchParams.PageNumber-1)*searchParams.PageSize)
	if err != nil {
		http.Error(w, "Failed to query accounts", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var totalCount int
	err = db.Conn.QueryRow(r.Context(), "SELECT COUNT(*) FROM accounts").Scan(&totalCount)
	if err != nil {
		http.Error(w, "Failed to count accounts", http.StatusInternalServerError)
		return
	}

	parsedResult := schema.PaginatedAccountSchema{}
	parsedResult.FromRows(rows, totalCount, searchParams)

	w.Header().Set("Content-Type", "application/json")
	w.Write(parsedResult.ToJSON())
}

func (ar *AccountResource) GetDetail(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	w.Write([]byte("Account details for ID: " + id))
}

func (ar *AccountResource) Create(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Create a new account"))
}

func (ar *AccountResource) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	w.Write([]byte("Update account with ID: " + id))
}

func (ar *AccountResource) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	w.Write([]byte("Delete account with ID: " + id))
}
