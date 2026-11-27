// Package cache is the one in-process TTL cache. It holds nothing the write
// path cannot invalidate: a value lives for a single TTL, a miss loads once and
// every caller waiting on that key shares that load, and the code that writes
// the table calls Delete or Clear in the same breath. It is process-local on
// purpose — the http and worker processes share the file, not this map.
package cache

import (
	"context"
	"sync"
	"time"
)

type entry[V any] struct {
	value   V
	expires time.Time
}

type flight[V any] struct {
	done  chan struct{}
	value V
	err   error
}

type Cache[K comparable, V any] struct {
	mu      sync.Mutex
	ttl     time.Duration
	now     func() time.Time
	entries map[K]entry[V]
	flights map[K]*flight[V]
}

func New[K comparable, V any](ttl time.Duration, now func() time.Time) *Cache[K, V] {
	if now == nil {
		now = time.Now
	}

	return &Cache[K, V]{
		ttl:     ttl,
		now:     now,
		entries: make(map[K]entry[V]),
		flights: make(map[K]*flight[V]),
	}
}

//nolint:ireturn,nolintlint // V is the caller's own concrete type; ireturn cannot see through a type param
func (c *Cache[K, V]) Get(key K) (V, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	stored, found := c.entries[key]
	if !found {
		var empty V

		return empty, false
	}

	if !c.now().Before(stored.expires) {
		delete(c.entries, key)

		var empty V

		return empty, false
	}

	return stored.value, true
}

func (c *Cache[K, V]) Set(key K, value V) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.entries[key] = entry[V]{value: value, expires: c.now().Add(c.ttl)}
}

func (c *Cache[K, V]) Delete(key K) {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.entries, key)
}

func (c *Cache[K, V]) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.entries = make(map[K]entry[V])
}

//nolint:ireturn,nolintlint // V is the caller's own concrete type; ireturn cannot see through a type param
func (c *Cache[K, V]) Load(
	ctx context.Context,
	key K,
	load func(context.Context) (V, error),
) (V, error) {
	if value, found := c.Get(key); found {
		return value, nil
	}

	c.mu.Lock()

	if pending, flying := c.flights[key]; flying {
		c.mu.Unlock()
		<-pending.done

		return pending.value, pending.err
	}

	pending := &flight[V]{done: make(chan struct{})}
	c.flights[key] = pending
	c.mu.Unlock()

	value, err := load(ctx)

	c.mu.Lock()
	delete(c.flights, key)

	if err == nil {
		c.entries[key] = entry[V]{value: value, expires: c.now().Add(c.ttl)}
	}

	pending.value, pending.err = value, err
	c.mu.Unlock()

	close(pending.done)

	return value, err
}
