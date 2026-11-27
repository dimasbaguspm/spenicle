package cache_test

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/repository/cache"
)

type fixedClock struct{ at time.Time }

func (c *fixedClock) Now() time.Time { return c.at }

func (c *fixedClock) advance(by time.Duration) { c.at = c.at.Add(by) }

func TestSetThenGet(t *testing.T) {
	store := cache.New[string, int](time.Minute, nil)

	store.Set("a", 7)

	if value, found := store.Get("a"); !found || value != 7 {
		t.Fatalf("Get = %d, %v, want 7, true", value, found)
	}

	if _, found := store.Get("b"); found {
		t.Fatal("an unwritten key must miss")
	}
}

func TestExpiry(t *testing.T) {
	start := time.Date(2026, time.March, 1, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name string
		walk time.Duration
		want bool
	}{
		{name: "just before the TTL", walk: time.Minute - time.Nanosecond, want: true},
		{name: "exactly at the TTL", walk: time.Minute},
		{name: "well past the TTL", walk: 2 * time.Minute},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			clock := &fixedClock{at: start}
			store := cache.New[string, int](time.Minute, clock.Now)

			store.Set("a", 7)
			clock.advance(testCase.walk)

			if _, found := store.Get("a"); found != testCase.want {
				t.Fatalf("found = %v, want %v", found, testCase.want)
			}
		})
	}
}

func TestDeleteRemovesOneKey(t *testing.T) {
	store := cache.New[string, int](time.Minute, nil)

	store.Set("a", 7)
	store.Set("b", 8)
	store.Delete("a")

	if _, found := store.Get("a"); found {
		t.Fatal("a deleted key must miss")
	}

	if _, found := store.Get("b"); !found {
		t.Fatal("a sibling key must survive")
	}
}

func TestClearRemovesEverything(t *testing.T) {
	store := cache.New[string, int](time.Minute, nil)

	store.Set("a", 7)
	store.Set("b", 8)
	store.Clear()

	if _, found := store.Get("a"); found {
		t.Fatal("a cleared key must miss")
	}

	if _, found := store.Get("b"); found {
		t.Fatal("a cleared key must miss")
	}
}

func TestLoadReadsThroughOnce(t *testing.T) {
	tests := []struct {
		name      string
		loadErr   error
		walk      time.Duration
		wantCalls int32
	}{
		{name: "one load answers every read", wantCalls: 1},
		{name: "a failed load is not kept", loadErr: errors.New("boom"), wantCalls: 2},
		{name: "an expired value loads again", walk: time.Minute, wantCalls: 2},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			clock := &fixedClock{at: time.Date(2026, time.March, 1, 0, 0, 0, 0, time.UTC)}
			store := cache.New[string, int](time.Minute, clock.Now)

			var calls atomic.Int32

			load := func(_ context.Context) (int, error) {
				calls.Add(1)

				if testCase.loadErr != nil {
					return 0, testCase.loadErr
				}

				return 42, nil
			}

			if _, err := store.Load(t.Context(), "k", load); err != nil && testCase.loadErr == nil {
				t.Fatalf("first load: %v", err)
			}

			clock.advance(testCase.walk)

			if _, err := store.Load(t.Context(), "k", load); err != nil && testCase.loadErr == nil {
				t.Fatalf("second load: %v", err)
			}

			if got := calls.Load(); got != testCase.wantCalls {
				t.Fatalf("loads = %d, want %d", got, testCase.wantCalls)
			}
		})
	}
}

func TestLoadCollapsesConcurrentMisses(t *testing.T) {
	store := cache.New[string, int](time.Minute, nil)

	var calls atomic.Int32

	release := make(chan struct{})

	load := func(_ context.Context) (int, error) {
		calls.Add(1)
		<-release

		return 7, nil
	}

	var group sync.WaitGroup

	results := make([]int, 8)

	for index := range results {
		group.Add(1)

		go func() {
			defer group.Done()

			value, err := store.Load(t.Context(), "k", load)
			if err != nil {
				panic(err)
			}

			results[index] = value
		}()
	}

	time.Sleep(20 * time.Millisecond)
	close(release)

	group.Wait()

	if got := calls.Load(); got != 1 {
		t.Fatalf("loads = %d, want 1", got)
	}

	for _, value := range results {
		if value != 7 {
			t.Fatalf("value = %d, want 7", value)
		}
	}
}
