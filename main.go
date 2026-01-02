package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	setupCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	routes := &RoutesConfig{}
	if err := routes.Setup(setupCtx); err != nil {
		log.Fatalf("Failed to set up routes: %v", err)
	}

	srv := routes.Run()

	// clean up on shutdown
	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("server shutdown error: %v", err)
	}
	routes.Close()
}
