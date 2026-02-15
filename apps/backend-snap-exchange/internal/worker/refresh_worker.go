package worker

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/dimasbaguspm/spenicle-snap-exchange/internal/observability"
	"github.com/dimasbaguspm/spenicle-snap-exchange/internal/scraper"
	"github.com/dimasbaguspm/spenicle-snap-exchange/internal/storage"
)

type RefreshWorker struct {
	ctx          context.Context
	cancel       context.CancelFunc
	scraper      *scraper.ECBScraper
	store        *storage.RateStore
	wg           sync.WaitGroup
	hourlyTicker *time.Ticker
	retryTicker  *time.Ticker
	retryActive  bool
}

func NewRefreshWorker(ctx context.Context, s *scraper.ECBScraper, store *storage.RateStore) *RefreshWorker {
	workerCtx, cancel := context.WithCancel(ctx)

	return &RefreshWorker{
		ctx:     workerCtx,
		cancel:  cancel,
		scraper: s,
		store:   store,
	}
}

// Start begins the refresh worker with initial scrape
func (w *RefreshWorker) Start() {
	slog.Info("Starting refresh worker")

	// Initial scrape on boot
	if err := w.refresh(); err != nil {
		slog.Error("Initial scrape failed", "err", err)
		// Continue anyway - service will return 503 until first successful scrape
	}

	// Start hourly ticker
	w.hourlyTicker = time.NewTicker(1 * time.Hour)

	// Start worker goroutine
	w.wg.Add(1)
	go w.run()
}

// Stop gracefully shuts down the worker
func (w *RefreshWorker) Stop() {
	slog.Info("Stopping refresh worker")

	if w.hourlyTicker != nil {
		w.hourlyTicker.Stop()
	}

	if w.retryTicker != nil {
		w.retryTicker.Stop()
	}

	w.cancel()
	w.wg.Wait()

	slog.Info("Refresh worker stopped")
}

// run is the main worker loop
func (w *RefreshWorker) run() {
	defer w.wg.Done()

	for {
		select {
		case <-w.ctx.Done():
			return

		case <-w.hourlyTicker.C:
			if err := w.refresh(); err != nil {
				slog.Error("Hourly refresh failed", "err", err)
				w.activateRetry()
			} else {
				w.deactivateRetry()
			}

		case <-w.getRetryChannel():
			if err := w.refresh(); err != nil {
				slog.Error("Retry refresh failed", "err", err)
			} else {
				slog.Info("Retry refresh succeeded")
				w.deactivateRetry()
			}
		}
	}
}

// refresh performs a single scrape and update operation
func (w *RefreshWorker) refresh() error {
	observability.ScrapesTotal.Inc()

	rates, err := w.scraper.Fetch(w.ctx)
	if err != nil {
		observability.ScrapesFailedTotal.Inc()
		return err
	}

	// Update store with new rates (flush and replace)
	w.store.UpdateRates(rates)

	// Update metrics
	observability.LastScrapeTimestamp.SetToCurrentTime()
	observability.RatesCount.Set(float64(len(rates)))

	slog.Info("Rates refreshed successfully", "count", len(rates))

	return nil
}

// activateRetry starts the retry ticker if not already active
func (w *RefreshWorker) activateRetry() {
	if w.retryActive {
		return
	}

	slog.Info("Activating retry ticker")
	w.retryTicker = time.NewTicker(15 * time.Minute)
	w.retryActive = true
}

// deactivateRetry stops the retry ticker
func (w *RefreshWorker) deactivateRetry() {
	if !w.retryActive {
		return
	}

	slog.Info("Deactivating retry ticker")
	if w.retryTicker != nil {
		w.retryTicker.Stop()
		w.retryTicker = nil
	}
	w.retryActive = false
}

// getRetryChannel returns the retry ticker channel or a dummy channel if inactive
func (w *RefreshWorker) getRetryChannel() <-chan time.Time {
	if w.retryActive && w.retryTicker != nil {
		return w.retryTicker.C
	}

	// Return a channel that never fires
	return make(<-chan time.Time)
}
