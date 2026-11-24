package sqlite_test

import (
	"errors"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

func TestCreateAccountWithParent(t *testing.T) {
	tests := []struct {
		name       string
		parentKind string
		childKind  string
		parentRef  string
		wantErr    error
	}{
		{
			name:       "a parent of the same kind is accepted",
			parentKind: "expense",
			childKind:  "expense",
		},
		{
			name:      "no parent is accepted",
			childKind: "expense",
		},
		{
			name:       "a parent of another kind is refused",
			parentKind: "asset",
			childKind:  "expense",
			wantErr:    entity.ErrInvalidParent,
		},
		{
			name:      "an unknown parent is refused",
			childKind: "expense",
			parentRef: "00000000000000000000000000000000",
			wantErr:   entity.ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assertAccountCreatedWithParent(t, tt.parentKind, tt.childKind, tt.parentRef, tt.wantErr)
		})
	}
}

func assertAccountCreatedWithParent(
	t *testing.T,
	parentKind, childKind, parentRef string,
	wantErr error,
) {
	t.Helper()

	ctx := t.Context()
	store := newStore(t)

	wantParent := parentRef

	if parentKind != "" {
		wantParent = createAccountNamed(t, store, "Parent", parentKind).Ref
	}

	child, err := store.CreateAccountWithParent(ctx, "Child", childKind, "IDR", wantParent)
	if wantErr != nil {
		requireError(t, err, wantErr)

		return
	}

	if err != nil {
		t.Fatalf("create child: %v", err)
	}

	requireParent(t, store, child, wantParent)
}

func parentTree(t *testing.T) (*sqlite.Store, map[string]string) {
	t.Helper()

	store := newStore(t)

	asset := createAccountNamed(t, store, "Cash", "asset")
	root := createAccountNamed(t, store, "Food", "expense")
	child := createExpenseChild(t, store, "Groceries", root.Ref)
	grand := createExpenseChild(t, store, "Vegetables", child.Ref)
	other := createAccountNamed(t, store, "Travel", "expense")

	return store, map[string]string{
		"asset": asset.Ref,
		"root":  root.Ref,
		"child": child.Ref,
		"grand": grand.Ref,
		"other": other.Ref,
	}
}

func TestUpdateAccountParent(t *testing.T) {
	tests := []struct {
		name    string
		target  string
		parent  string
		wantErr error
	}{
		{name: "a parent is accepted", target: "other", parent: "root"},
		{name: "a grandchild is reparented on the root", target: "grand", parent: "root"},
		{name: "the parent is cleared", target: "grand", parent: ""},
		{
			name:    "a parent of another kind is refused",
			target:  "other",
			parent:  "asset",
			wantErr: entity.ErrInvalidParent,
		},
		{
			name:    "an account cannot parent itself",
			target:  "root",
			parent:  "root",
			wantErr: entity.ErrInvalidParent,
		},
		{
			name:    "a cycle through a descendant is refused",
			target:  "root",
			parent:  "grand",
			wantErr: entity.ErrInvalidParent,
		},
		{
			name:    "a fourth level is refused",
			target:  "other",
			parent:  "grand",
			wantErr: entity.ErrInvalidParent,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assertParentChanged(t, tt.target, tt.parent, tt.wantErr)
		})
	}
}

func assertParentChanged(t *testing.T, target, parent string, wantErr error) {
	t.Helper()

	ctx := t.Context()
	store, refs := parentTree(t)

	account, found, err := store.AccountByRef(ctx, refs[target])
	if err != nil {
		t.Fatalf("read target: %v", err)
	}

	if !found {
		t.Fatal("target not found by ref")
	}

	account.ParentRef = refs[parent]

	updated, err := store.UpdateAccount(ctx, account)
	if wantErr != nil {
		requireError(t, err, wantErr)

		return
	}

	if err != nil {
		t.Fatalf("update: %v", err)
	}

	requireParent(t, store, updated, refs[parent])
}

type rollupPosting struct {
	account string
	amount  int64
}

func TestCategoryTotalsByRoot(t *testing.T) {
	tests := []struct {
		name     string
		postings []rollupPosting
		want     map[string]int64
	}{
		{
			name:     "a child sums into its root",
			postings: []rollupPosting{{account: "groceries", amount: 25_000}},
			want:     map[string]int64{"food": 25_000},
		},
		{
			name: "a root and its child share one row",
			postings: []rollupPosting{
				{account: "groceries", amount: 10_000},
				{account: "food", amount: 5_000},
			},
			want: map[string]int64{"food": 15_000},
		},
		{
			name:     "a root without children stays alone",
			postings: []rollupPosting{{account: "travel", amount: 7_000}},
			want:     map[string]int64{"travel": 7_000},
		},
		{
			name: "a root that nets to zero is dropped",
			postings: []rollupPosting{
				{account: "groceries", amount: 4_000},
				{account: "food", amount: -4_000},
			},
			want: map[string]int64{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assertRollup(t, tt.postings, tt.want)
		})
	}
}

func assertRollup(t *testing.T, postings []rollupPosting, want map[string]int64) {
	t.Helper()

	ctx := t.Context()
	store, accounts := rollupTree(t)

	insertPostedEntry(t, store, accounts, postings)

	from := time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 2, 28, 0, 0, 0, 0, time.UTC)

	totals, err := store.CategoryTotalsByRoot(ctx, from, to, "expense")
	if err != nil {
		t.Fatalf("category roll-up: %v", err)
	}

	got := make(map[string]int64, len(totals))

	for _, total := range totals {
		got[accountKey(accounts, total.AccountRef)] = total.AmountMinor
	}

	if len(got) != len(want) {
		t.Fatalf("categories = %v, want %v", got, want)
	}

	for key, amount := range want {
		if got[key] != amount {
			t.Fatalf("%s = %d, want %d", key, got[key], amount)
		}
	}
}

func rollupTree(t *testing.T) (*sqlite.Store, map[string]entity.Account) {
	t.Helper()

	store := newStore(t)

	cash := createAccountNamed(t, store, "Cash", "asset")
	food := createAccountNamed(t, store, "Food", "expense")
	groceries := createExpenseChild(t, store, "Groceries", food.Ref)
	travel := createAccountNamed(t, store, "Travel", "expense")

	return store, map[string]entity.Account{
		"cash":      cash,
		"food":      food,
		"groceries": groceries,
		"travel":    travel,
	}
}

func insertPostedEntry(
	t *testing.T,
	store *sqlite.Store,
	accounts map[string]entity.Account,
	spend []rollupPosting,
) {
	t.Helper()

	postings := make([]entity.Posting, 0, len(spend)+1)
	total := int64(0)

	for _, posting := range spend {
		postings = append(postings, entity.Posting{
			AccountID:       accounts[posting.account].ID,
			AmountMinor:     posting.amount,
			BaseAmountMinor: posting.amount,
		})

		total += posting.amount
	}

	postings = append(postings, entity.Posting{
		AccountID:       accounts["cash"].ID,
		AmountMinor:     -total,
		BaseAmountMinor: -total,
	})

	entry, err := entity.NewEntry(entity.Entry{
		OccurredOn: time.Date(2026, 2, 10, 0, 0, 0, 0, time.UTC),
		Currency:   "IDR",
		Postings:   postings,
	})
	if err != nil {
		t.Fatalf("new entry: %v", err)
	}

	if _, err := store.InsertEntry(t.Context(), entry); err != nil {
		t.Fatalf("insert entry: %v", err)
	}
}

func createAccountNamed(t *testing.T, store *sqlite.Store, name, kind string) entity.Account {
	t.Helper()

	account, err := store.CreateAccount(t.Context(), name, kind, "IDR")
	if err != nil {
		t.Fatalf("create %s account: %v", name, err)
	}

	return account
}

func createExpenseChild(t *testing.T, store *sqlite.Store, name, parentRef string) entity.Account {
	t.Helper()

	account, err := store.CreateAccountWithParent(t.Context(), name, "expense", "IDR", parentRef)
	if err != nil {
		t.Fatalf("create %s account: %v", name, err)
	}

	return account
}

func requireParent(t *testing.T, store *sqlite.Store, child entity.Account, want string) {
	t.Helper()

	if child.ParentRef != want {
		t.Fatalf("parent ref = %q, want %q", child.ParentRef, want)
	}

	stored, found, err := store.AccountByRef(t.Context(), child.Ref)
	if err != nil {
		t.Fatalf("read %s: %v", child.Ref, err)
	}

	if !found {
		t.Fatalf("account %s not found by ref", child.Ref)
	}

	if stored.ParentRef != want {
		t.Fatalf("stored parent ref = %q, want %q", stored.ParentRef, want)
	}

	if want != "" && stored.ParentID == nil {
		t.Fatal("stored parent id is null, want a parent")
	}
}

func requireError(t *testing.T, err, want error) {
	t.Helper()

	if !errors.Is(err, want) {
		t.Fatalf("want %v, got %v", want, err)
	}
}

func accountKey(accounts map[string]entity.Account, ref string) string {
	for key, account := range accounts {
		if account.Ref == ref {
			return key
		}
	}

	return ref
}
