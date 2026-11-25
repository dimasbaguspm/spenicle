package captures

import (
	"context"
	"encoding/json"
	"errors"
	"path/filepath"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/common/uuid"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

func TestApprovable(t *testing.T) {
	tests := []struct {
		name    string
		status  string
		want    string
		wantErr bool
	}{
		{name: "pending", status: constant.CaptureStatusPending, want: constant.CaptureStatusApproved},
		{name: "failed", status: constant.CaptureStatusFailed, want: constant.CaptureStatusApproved},
		{name: "extracting", status: constant.CaptureStatusExtracting, want: constant.CaptureStatusApproved},
		{name: "approved", status: constant.CaptureStatusApproved, want: constant.CaptureStatusApproved, wantErr: true},
		{name: "rejected", status: constant.CaptureStatusRejected, want: constant.CaptureStatusRejected, wantErr: true},
		{name: "duplicate", status: constant.CaptureStatusDuplicate, want: constant.CaptureStatusDuplicate, wantErr: true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			capture := entity.Capture{Status: tc.status}
			err := approvable(&capture)
			if (err != nil) != tc.wantErr {
				t.Fatalf("err = %v, wantErr = %v", err, tc.wantErr)
			}
			if capture.Status != tc.want {
				t.Fatalf("status = %q, want %q", capture.Status, tc.want)
			}
		})
	}
}

type retryExtractor struct {
	polls  int
	onPoll func(context.Context) error
}

func (e *retryExtractor) Rail() string { return "snaptojson" }

func (e *retryExtractor) Model() string { return "test-model" }

func (e *retryExtractor) Submit(context.Context, extraction.Artifact) (extraction.Report, error) {
	return extraction.Report{}, errors.New("submit is not used by retry")
}

func (e *retryExtractor) Poll(ctx context.Context, jobRef string) (extraction.Report, error) {
	e.polls++

	if e.onPoll != nil {
		if err := e.onPoll(ctx); err != nil {
			return extraction.Report{}, err
		}
	}

	return extraction.Report{
		Rail:   e.Rail(),
		Model:  e.Model(),
		Status: extraction.StatusCompleted,
		JobRef: jobRef,
		Data:   json.RawMessage(`{}`),
		Valid:  true,
	}, nil
}

func TestRetryRefusesResolvedCaptures(t *testing.T) {
	tests := []struct {
		name       string
		status     string
		approve    bool
		wantPolls  int
		wantStatus string
	}{
		{name: "approved", status: constant.CaptureStatusApproved, wantStatus: constant.CaptureStatusApproved},
		{name: "rejected", status: constant.CaptureStatusRejected, wantStatus: constant.CaptureStatusRejected},
		{name: "duplicate", status: constant.CaptureStatusDuplicate, wantStatus: constant.CaptureStatusDuplicate},
		{
			name:       "approved while polling",
			status:     constant.CaptureStatusFailed,
			approve:    true,
			wantPolls:  1,
			wantStatus: constant.CaptureStatusApproved,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ctx := t.Context()
			store, err := sqlite.New(ctx, sqlite.Config{Path: filepath.Join(t.TempDir(), "captures.db")})
			if err != nil {
				t.Fatalf("open store: %v", err)
			}
			t.Cleanup(func() { _ = store.Close(context.WithoutCancel(ctx)) })
			if err := sqlite.Migrate(ctx, store.DB()); err != nil {
				t.Fatalf("migrate: %v", err)
			}

			capture, err := store.InsertCapture(ctx, entity.Capture{
				Kind:       constant.CaptureKindManual,
				Status:     tc.status,
				DedupeKey:  uuid.New(),
				JobRef:     "job-1",
				ReceivedAt: time.Date(2026, time.February, 14, 0, 0, 0, 0, time.UTC),
			})
			if err != nil {
				t.Fatalf("insert capture: %v", err)
			}

			extractor := &retryExtractor{}
			if tc.approve {
				extractor.onPoll = func(ctx context.Context) error {
					current, found, err := store.CaptureByRef(ctx, capture.Ref)
					if err != nil || !found {
						return errors.Join(err, entity.ErrNotFound)
					}
					current.Status = constant.CaptureStatusApproved
					_, err = store.UpdateCapture(ctx, current)

					return err
				}
			}

			sealer, err := seal.New("0123456789abcdef")
			if err != nil {
				t.Fatalf("seal: %v", err)
			}
			service := &Service{captures: store, sealer: sealer, extractor: extractor}

			_, err = service.Retry(ctx, capture.Ref)
			if !errors.Is(err, entity.ErrCaptureResolved) {
				t.Fatalf("err = %v, want capture_resolved", err)
			}
			if extractor.polls != tc.wantPolls {
				t.Fatalf("polls = %d, want %d", extractor.polls, tc.wantPolls)
			}

			stored, found, err := store.CaptureByRef(ctx, capture.Ref)
			if err != nil || !found {
				t.Fatalf("read capture: found=%v err=%v", found, err)
			}
			if stored.Status != tc.wantStatus {
				t.Fatalf("status = %q, want %q", stored.Status, tc.wantStatus)
			}
			if stored.DraftJSON != "" {
				t.Fatalf("draft_json = %q, want empty", stored.DraftJSON)
			}
		})
	}
}
