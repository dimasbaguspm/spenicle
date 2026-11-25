package entity_test

import (
	"errors"
	"math"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type newSetupCase struct {
	name         string
	baseCurrency string
	accounts     []entity.OpeningAccount
	occurredOn   time.Time
	want         []entity.OpeningAccount
	wantErr      error
}

func TestNewSetup(t *testing.T) {
	day := time.Date(2026, time.February, 14, 0, 0, 0, 0, time.UTC)

	tests := []newSetupCase{
		{
			name:         "currency only remains valid",
			baseCurrency: " usd ",
			occurredOn:   day,
			want:         []entity.OpeningAccount{},
		},
		{
			name:         "names are trimmed and signs are kept",
			baseCurrency: "IDR",
			occurredOn:   day,
			accounts: []entity.OpeningAccount{
				{Name: " Cash ", Kind: constant.AccountKindAsset, AmountMinor: 125_000},
				{Name: "Card", Kind: constant.AccountKindLiability, AmountMinor: -50_000},
			},
			want: []entity.OpeningAccount{
				{Name: "Cash", Kind: constant.AccountKindAsset, AmountMinor: 125_000},
				{Name: "Card", Kind: constant.AccountKindLiability, AmountMinor: -50_000},
			},
		},
		{name: "unknown currency", baseCurrency: "RUPIAH", occurredOn: day, wantErr: entity.ErrUnknownCurrency},
		{name: "missing day", baseCurrency: "USD", wantErr: entity.ErrInvalidSetup},
		{
			name: "too many accounts", baseCurrency: "USD", occurredOn: day,
			accounts: make([]entity.OpeningAccount, entity.SetupMaxAccounts+1), wantErr: entity.ErrInvalidSetup,
		},
		{
			name: "blank name", baseCurrency: "USD", occurredOn: day,
			accounts: []entity.OpeningAccount{{Name: " ", Kind: constant.AccountKindAsset, AmountMinor: 1}},
			wantErr:  entity.ErrInvalidSetup,
		},
		{
			name: "invalid kind", baseCurrency: "USD", occurredOn: day,
			accounts: []entity.OpeningAccount{{Name: "Cash", Kind: "card", AmountMinor: 1}},
			wantErr:  entity.ErrInvalidSetup,
		},
		{
			name: "reserved opening account", baseCurrency: "USD", occurredOn: day,
			accounts: []entity.OpeningAccount{{
				Name: constant.OpeningAccountName, Kind: constant.AccountKindEquity, AmountMinor: 1,
			}},
			wantErr: entity.ErrInvalidSetup,
		},
		{
			name: "zero balance", baseCurrency: "USD", occurredOn: day,
			accounts: []entity.OpeningAccount{{Name: "Cash", Kind: constant.AccountKindAsset}},
			wantErr:  entity.ErrInvalidSetup,
		},
		{
			name: "amount cannot be negated", baseCurrency: "USD", occurredOn: day,
			accounts: []entity.OpeningAccount{{Name: "Cash", Kind: constant.AccountKindAsset, AmountMinor: math.MinInt64}},
			wantErr:  entity.ErrInvalidSetup,
		},
		{
			name: "duplicate name and kind", baseCurrency: "USD", occurredOn: day,
			accounts: []entity.OpeningAccount{
				{Name: "Cash", Kind: constant.AccountKindAsset, AmountMinor: 1},
				{Name: "Cash", Kind: constant.AccountKindAsset, AmountMinor: 2},
			},
			wantErr: entity.ErrInvalidSetup,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			assertNewSetup(t, test)
		})
	}
}

func assertNewSetup(t *testing.T, test newSetupCase) {
	t.Helper()

	got, err := entity.NewSetup(test.baseCurrency, test.accounts, test.occurredOn)
	if test.wantErr != nil {
		if !errors.Is(err, test.wantErr) {
			t.Fatalf("error = %v, want %v", err, test.wantErr)
		}

		return
	}

	if err != nil {
		t.Fatalf("new setup: %v", err)
	}

	if got.BaseCurrency == "" {
		t.Fatal("the currency was not normalized")
	}

	if len(got.Accounts) != len(test.want) {
		t.Fatalf("accounts = %d, want %d", len(got.Accounts), len(test.want))
	}

	for index := range test.want {
		if got.Accounts[index] != test.want[index] {
			t.Fatalf("account %d = %+v, want %+v", index, got.Accounts[index], test.want[index])
		}
	}
}
