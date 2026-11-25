package captures

import (
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
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
