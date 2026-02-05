package common

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// CronTask represents a scheduled task to be executed by the cron worker
type CronTask struct {
	ID              string        // Unique identifier for the task
	Name            string        // Human-readable name
	Schedule        time.Duration // How often to run the task
	Handler         CronHandler   // Function to execute
	RunImmediately  bool          // If true, execute the handler once before starting the ticker loop
}

// CronHandler is the function signature for cron task handlers
type CronHandler func(ctx context.Context) error

// CronWorker manages scheduled cron tasks
type CronWorker struct {
	ctx      context.Context
	cancel   context.CancelFunc
	tasks    map[string]*scheduledTask
	taskMu   sync.RWMutex
	wg       sync.WaitGroup
	stopping chan struct{}
}

// scheduledTask represents a task with its ticker
type scheduledTask struct {
	task   CronTask
	ticker *time.Ticker
}

// NewCronWorker creates a new cron worker
func NewCronWorker(ctx context.Context) *CronWorker {
	workerCtx, cancel := context.WithCancel(ctx)
	return &CronWorker{
		ctx:      workerCtx,
		cancel:   cancel,
		tasks:    make(map[string]*scheduledTask),
		stopping: make(chan struct{}),
	}
}

// Register adds a new cron task to be scheduled
// Returns error if task ID already exists
func (cw *CronWorker) Register(task CronTask) error {
	if task.Handler == nil {
		return fmt.Errorf("handler cannot be nil for task %s", task.ID)
	}
	if task.Schedule <= 0 {
		return fmt.Errorf("schedule duration must be positive for task %s", task.ID)
	}

	cw.taskMu.Lock()
	defer cw.taskMu.Unlock()

	if _, exists := cw.tasks[task.ID]; exists {
		return fmt.Errorf("task %s already registered", task.ID)
	}

	ticker := time.NewTicker(task.Schedule)
	cw.tasks[task.ID] = &scheduledTask{
		task:   task,
		ticker: ticker,
	}

	// Start the task goroutine
	cw.wg.Add(1)
	go cw.runTask(task, ticker)

	return nil
}

// runTask executes a scheduled task repeatedly
func (cw *CronWorker) runTask(task CronTask, ticker *time.Ticker) {
	defer cw.wg.Done()
	defer ticker.Stop()

	// Run immediately on startup if configured
	if task.RunImmediately {
		taskCtx, cancel := context.WithTimeout(cw.ctx, 30*time.Second)
		if err := task.Handler(taskCtx); err != nil {
			fmt.Printf("Cron task %s (%s) immediate run failed: %v\n", task.ID, task.Name, err)
		}
		cancel()
	}

	for {
		select {
		case <-cw.ctx.Done():
			return
		case <-cw.stopping:
			return
		case <-ticker.C:
			// Execute the task handler
			taskCtx, cancel := context.WithTimeout(cw.ctx, 30*time.Second)
			if err := task.Handler(taskCtx); err != nil {
				// Log error but continue - tasks should handle their own errors
				// In production, you might want to send this to a logging service
				fmt.Printf("Cron task %s (%s) failed: %v\n", task.ID, task.Name, err)
			}
			cancel()
		}
	}
}

// Stop gracefully shuts down the cron worker and all scheduled tasks
func (cw *CronWorker) Stop() {
	select {
	case <-cw.stopping:
		return // Already stopped
	default:
	}

	close(cw.stopping)

	cw.taskMu.Lock()
	for _, st := range cw.tasks {
		st.ticker.Stop()
	}
	cw.taskMu.Unlock()

	cw.cancel()
	cw.wg.Wait()
}

// GetTaskCount returns the number of registered tasks
func (cw *CronWorker) GetTaskCount() int {
	cw.taskMu.RLock()
	defer cw.taskMu.RUnlock()
	return len(cw.tasks)
}
