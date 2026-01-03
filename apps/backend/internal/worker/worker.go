package worker

import (
	"context"
	"sync"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/observability/logger"
)

// Job represents a scheduled task that can be executed
type Job interface {
	// Name returns the unique identifier for this job
	Name() string
	// Run executes the job logic
	Run(ctx context.Context) error
	// Schedule returns when the job should run (daily at midnight = "00:00")
	Schedule() string
}

// Worker manages and executes scheduled jobs
type Worker struct {
	jobs     []Job
	stopChan chan struct{}
	wg       sync.WaitGroup
	mu       sync.Mutex
	running  bool
}

// New creates a new worker instance
func New() *Worker {
	return &Worker{
		jobs:     make([]Job, 0),
		stopChan: make(chan struct{}),
	}
}

// Register adds a job to the worker
func (w *Worker) Register(job Job) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.jobs = append(w.jobs, job)
	logger.Log().Info("Registered job", "name", job.Name(), "schedule", job.Schedule())
}

// Start begins executing all registered jobs on their schedules
func (w *Worker) Start(ctx context.Context) {
	w.mu.Lock()
	if w.running {
		w.mu.Unlock()
		logger.Log().Warn("Worker already running")
		return
	}
	w.running = true
	w.mu.Unlock()

	logger.Log().Info("Starting worker", "jobs_count", len(w.jobs))

	for _, job := range w.jobs {
		w.wg.Add(1)
		go w.runJob(ctx, job)
	}
}

// Stop gracefully shuts down the worker
func (w *Worker) Stop() {
	w.mu.Lock()
	if !w.running {
		w.mu.Unlock()
		return
	}
	w.mu.Unlock()

	logger.Log().Info("Stopping worker...")
	close(w.stopChan)
	w.wg.Wait()

	w.mu.Lock()
	w.running = false
	w.mu.Unlock()

	logger.Log().Info("Worker stopped")
}

// runJob executes a single job on its schedule
func (w *Worker) runJob(ctx context.Context, job Job) {
	defer w.wg.Done()

	ticker := w.calculateNextTick(job.Schedule())
	defer ticker.Stop()

	logger.Log().Info("Job scheduled", "name", job.Name())

	for {
		select {
		case <-ctx.Done():
			logger.Log().Info("Job stopped due to context cancellation", "name", job.Name())
			return
		case <-w.stopChan:
			logger.Log().Info("Job stopped", "name", job.Name())
			return
		case <-ticker.C:
			w.executeJob(ctx, job)
			// Recalculate next tick after execution
			ticker.Stop()
			ticker = w.calculateNextTick(job.Schedule())
		}
	}
}

// executeJob runs a job and logs the result
func (w *Worker) executeJob(ctx context.Context, job Job) {
	logger.Log().Info("Executing job", "name", job.Name())
	startTime := time.Now()

	if err := job.Run(ctx); err != nil {
		logger.Log().Error("Job execution failed",
			"name", job.Name(),
			"error", err,
			"duration", time.Since(startTime),
		)
	} else {
		logger.Log().Info("Job execution completed",
			"name", job.Name(),
			"duration", time.Since(startTime),
		)
	}
}

// calculateNextTick determines when the next job execution should occur
// schedule format: "HH:MM" (24-hour format)
func (w *Worker) calculateNextTick(schedule string) *time.Ticker {
	now := time.Now()

	// Parse schedule time (e.g., "00:00" for midnight)
	var hour, minute int
	if _, err := time.Parse("15:04", schedule); err != nil {
		logger.Log().Error("Invalid schedule format, defaulting to 1 hour", "schedule", schedule)
		return time.NewTicker(time.Hour)
	}

	if n, err := time.ParseInLocation("15:04", schedule, now.Location()); err == nil {
		hour = n.Hour()
		minute = n.Minute()
	}

	// Calculate next occurrence
	nextRun := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, now.Location())

	// If the time has already passed today, schedule for tomorrow
	if nextRun.Before(now) {
		nextRun = nextRun.Add(24 * time.Hour)
	}

	duration := time.Until(nextRun)
	logger.Log().Debug("Calculated next run", "schedule", schedule, "duration", duration, "next_run", nextRun)

	// Return a ticker that fires after the calculated duration, then every 24 hours
	return time.NewTicker(duration)
}
