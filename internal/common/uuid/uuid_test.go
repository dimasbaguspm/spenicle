package uuid_test

import (
	"strings"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/uuid"
)

func TestNewIsADashlessUUIDv7(t *testing.T) {
	t.Parallel()

	ref := uuid.New()

	if len(ref) != 32 {
		t.Fatalf("length = %d, want 32", len(ref))
	}

	if strings.ToLower(ref) != ref {
		t.Fatalf("%q is not lowercase", ref)
	}

	if ref[versionAt] != '7' {
		t.Fatalf("version nibble = %q, want 7", ref[versionAt])
	}

	if !strings.ContainsRune("89ab", rune(ref[variantAt])) {
		t.Fatalf("variant nibble = %q, want one of 8 9 a b", ref[variantAt])
	}
}

func TestNewSortsByCreationTime(t *testing.T) {
	t.Parallel()

	first := uuid.New()

	time.Sleep(2 * time.Millisecond)

	second := uuid.New()

	if first >= second {
		t.Fatalf("%q should sort before %q", first, second)
	}
}

const (
	versionAt = 12
	variantAt = 16
)
