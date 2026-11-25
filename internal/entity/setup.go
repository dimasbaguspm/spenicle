package entity

import (
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

const SetupMaxAccounts = 100

var ErrInvalidSetup = errors.New("invalid setup")

type OpeningAccount struct {
	Name        string
	Kind        string
	AmountMinor int64
}

type Setup struct {
	BaseCurrency string
	Accounts     []OpeningAccount
	OccurredOn   time.Time
}

func NewSetup(baseCurrency string, accounts []OpeningAccount, occurredOn time.Time) (Setup, error) {
	code := strings.ToUpper(strings.TrimSpace(baseCurrency))
	if _, err := CurrencyByCode(code); err != nil {
		return Setup{}, err
	}

	if occurredOn.IsZero() {
		return Setup{}, fmt.Errorf("%w: occurred_on is required", ErrInvalidSetup)
	}

	if len(accounts) > SetupMaxAccounts {
		return Setup{}, fmt.Errorf("%w: at most %d accounts", ErrInvalidSetup, SetupMaxAccounts)
	}

	seen := make(map[string]bool, len(accounts))

	for index, account := range accounts {
		normalised, err := normaliseOpeningAccount(account, index)
		if err != nil {
			return Setup{}, err
		}

		key := normalised.Name + "\x00" + normalised.Kind
		if seen[key] {
			return Setup{}, fmt.Errorf("%w: duplicate account %q", ErrInvalidSetup, normalised.Name)
		}

		seen[key] = true
		accounts[index] = normalised
	}

	return Setup{BaseCurrency: code, Accounts: accounts, OccurredOn: occurredOn}, nil
}

func normaliseOpeningAccount(account OpeningAccount, index int) (OpeningAccount, error) {
	account.Name = strings.TrimSpace(account.Name)
	if account.Name == "" || len(account.Name) > 80 {
		return OpeningAccount{}, fmt.Errorf("%w: account %d has an invalid name", ErrInvalidSetup, index)
	}

	if !validAccountKind(account.Kind) {
		return OpeningAccount{}, fmt.Errorf("%w: account %d has an invalid kind", ErrInvalidSetup, index)
	}

	if account.Kind == constant.AccountKindEquity && account.Name == constant.OpeningAccountName {
		return OpeningAccount{}, fmt.Errorf("%w: account %d uses the reserved opening account",
			ErrInvalidSetup, index)
	}

	if account.AmountMinor == 0 || account.AmountMinor == math.MinInt64 {
		return OpeningAccount{}, fmt.Errorf(
			"%w: account %d has an invalid opening balance", ErrInvalidSetup, index,
		)
	}

	return account, nil
}

func validAccountKind(kind string) bool {
	switch kind {
	case constant.AccountKindAsset, constant.AccountKindLiability,
		constant.AccountKindEquity, constant.AccountKindExpense, constant.AccountKindIncome:
		return true
	default:
		return false
	}
}
