package entity

import (
	"errors"
	"fmt"
	"time"
)

var ErrInvalidParent = errors.New("invalid parent")

const AccountMaxDepth = 3

type Account struct {
	ID         int64
	Ref        string
	Name       string
	Kind       string
	ParentRef  string
	Currency   string
	Icon       string
	ArchivedAt *time.Time
	CreatedAt  time.Time
}

type AccountParent struct {
	ChildRef    string
	ChildKind   string
	Ancestors   []Account
	Descendants int
}

func CheckParent(candidate AccountParent) error {
	for _, ancestor := range candidate.Ancestors {
		if ancestor.Kind != candidate.ChildKind {
			return fmt.Errorf(
				"%w: a parent must share the child's kind %q", ErrInvalidParent, candidate.ChildKind,
			)
		}

		if candidate.ChildRef != "" && ancestor.Ref == candidate.ChildRef {
			return fmt.Errorf("%w: an account cannot descend from itself", ErrInvalidParent)
		}
	}

	if depth := len(candidate.Ancestors) + 1 + candidate.Descendants; depth > AccountMaxDepth {
		return fmt.Errorf("%w: depth %d exceeds %d", ErrInvalidParent, depth, AccountMaxDepth)
	}

	return nil
}

type AccountBalance struct {
	Account

	BaseAmountMinor int64
}

type AccountFilter struct {
	Query     string
	Refs      []string
	Currency  string
	Kind      string
	ParentRef string
	Archived  string
	Cursor    string
	Limit     int
}

type CaptureFilter struct {
	Status string
	Refs   []string
	Cursor string
	Limit  int
}

type EntryFilter struct {
	From        time.Time
	To          time.Time
	AccountRefs []string
	PayeeRefs   []string
	Sources     []string
	Currency    string
	Query       string
	Refs        []string
	Voided      string
	AmountMin   *int64
	AmountMax   *int64
	Cursor      string
	Limit       int
	WithBalance bool
}
