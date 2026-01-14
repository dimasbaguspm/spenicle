package common

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"
)

type QueueJob struct {
	ID      string                 // Unique identifier for the job
	Type    string                 // Job type (for routing to appropriate handler)
	Payload map[string]interface{} // Job data
	Meta    map[string]interface{} // Metadata (retries, timestamps, etc.)
}

// QueueHandler is the function signature for job handlers
type QueueHandler func(ctx context.Context, job QueueJob) error

// QueueWorker manages a queue of jobs with configurable concurrency
type QueueWorker struct {
	ctx         context.Context
	cancel      context.CancelFunc
	jobs        chan QueueJob
	handlers    map[string]QueueHandler
	handlerMu   sync.RWMutex
	wg          sync.WaitGroup
	concurrency int
	stopping    int32
	drainTime   time.Duration
}

// NewQueueWorker creates a new queue worker with specified concurrency
// concurrency determines how many jobs can be processed in parallel
func NewQueueWorker(ctx context.Context, concurrency int) *QueueWorker {
	if concurrency <= 0 {
		concurrency = 1
	}

	workerCtx, cancel := context.WithCancel(ctx)
	qw := &QueueWorker{
		ctx:         workerCtx,
		cancel:      cancel,
		jobs:        make(chan QueueJob, 1024),
		handlers:    make(map[string]QueueHandler),
		concurrency: concurrency,
		drainTime:   5 * time.Second,
	}

	for i := 0; i < concurrency; i++ {
		qw.wg.Add(1)
		go qw.work()
	}

	return qw
}

// RegisterHandler registers a handler for a specific job type
// Panics if handler is nil
func (qw *QueueWorker) RegisterHandler(jobType string, handler QueueHandler) {
	if handler == nil {
		panic(fmt.Sprintf("handler cannot be nil for job type %s", jobType))
	}

	qw.handlerMu.Lock()
	qw.handlers[jobType] = handler
	qw.handlerMu.Unlock()
}

func (qw *QueueWorker) Enqueue(job QueueJob) bool {
	// Worker is shutting down; drop job
	if atomic.LoadInt32(&qw.stopping) == 1 {
		return false
	}

	select {
	case qw.jobs <- job:
		return true
	default:
		// Queue is full; drop job
		return false
	}
}

// work is the main worker goroutine that processes jobs
func (qw *QueueWorker) work() {
	defer qw.wg.Done()

	for {
		select {
		case <-qw.ctx.Done():
			return
		case job := <-qw.jobs:
			qw.processJob(job)
		}
	}
}

// processJob executes a job with the appropriate handler
func (qw *QueueWorker) processJob(job QueueJob) {
	qw.handlerMu.RLock()
	handler, exists := qw.handlers[job.Type]
	qw.handlerMu.RUnlock()

	if !exists {
		// Log warning but continue - unknown job type
		fmt.Printf("No handler registered for job type: %s\n", job.Type)
		return
	}

	// Execute job with timeout
	jobCtx, cancel := context.WithTimeout(qw.ctx, 30*time.Second)
	defer cancel()

	if err := handler(jobCtx, job); err != nil {
		// Log error but continue - handlers should implement their own retry logic
		fmt.Printf("Job %s (type: %s) failed: %v\n", job.ID, job.Type, err)
	}
}

// Stop gracefully shuts down the queue worker, draining remaining jobs
func (qw *QueueWorker) Stop() {
	if !atomic.CompareAndSwapInt32(&qw.stopping, 0, 1) {
		return
	}

	// Give the queue time to process remaining jobs before shutting down
	drainCtx, cancel := context.WithTimeout(context.Background(), qw.drainTime)
	drainDone := make(chan struct{})

	go func() {
		defer close(drainDone)
		close(qw.jobs)
		qw.wg.Wait()
	}()

	select {
	case <-drainDone:
		// All jobs processed
	case <-drainCtx.Done():
		// Timeout reached, force shutdown
	}

	cancel()
	qw.cancel()
}

// GetQueueSize returns the current number of jobs in the queue
func (qw *QueueWorker) GetQueueSize() int {
	return len(qw.jobs)
}

// GetHandlerCount returns the number of registered handlers
func (qw *QueueWorker) GetHandlerCount() int {
	qw.handlerMu.RLock()
	defer qw.handlerMu.RUnlock()
	return len(qw.handlers)
}
