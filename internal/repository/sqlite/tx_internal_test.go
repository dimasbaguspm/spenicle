package sqlite

import (
	"context"
	"errors"
	"testing"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

type coderError struct {
	code int
	msg  string
}

func (e coderError) Error() string { return e.msg }

func (e coderError) Code() int { return e.code }

func TestRetryLockedOnlyRepeatsSQLiteLockFailures(t *testing.T) {
	sentinel := errors.New("caller failed")

	tests := []struct {
		name      string
		failures  []error
		cancel    bool
		wantCalls int
		wantErr   error
	}{
		{
			name:      "a plain error is not retried",
			failures:  []error{sentinel},
			wantCalls: 1,
			wantErr:   sentinel,
		},
		{
			name:      "a busy begin succeeds on retry",
			failures:  []error{coderError{code: sqliteBusy, msg: "busy"}},
			wantCalls: 2,
		},
		{
			name: "a locked commit stops at the bound",
			failures: []error{
				coderError{code: sqliteLocked, msg: "first"},
				coderError{code: sqliteBusy, msg: "second"},
			},
			wantCalls: 2,
			wantErr:   coderError{code: sqliteBusy, msg: "second"},
		},
		{
			name:      "cancellation during backoff stops the retry",
			failures:  []error{coderError{code: sqliteBusy, msg: "busy"}},
			cancel:    true,
			wantCalls: 1,
			wantErr:   context.Canceled,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctx, cancel := context.WithCancel(t.Context())
			defer cancel()

			calls := 0

			err := retryLocked(ctx, telemetry.OperationBegin, func() error {
				calls++
				if calls > len(test.failures) {
					return nil
				}

				if test.cancel && calls == 1 {
					cancel()
				}

				return test.failures[calls-1]
			})

			if !errors.Is(err, test.wantErr) {
				t.Fatalf("err = %v, want %v", err, test.wantErr)
			}

			if calls != test.wantCalls {
				t.Fatalf("calls = %d, want %d", calls, test.wantCalls)
			}
		})
	}
}
