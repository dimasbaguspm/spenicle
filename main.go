package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/dimasbaguspm/spenicle-api/config"
)

func main() {
	env := &config.Environment{}
	env.Setup()

	// cancelable context for graceful shutdown
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// short timeout for setup
	setupCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	routes := &RoutesConfig{Environment: env}
	if err := routes.Setup(setupCtx); err != nil {
		log.Fatalf("Failed to set up routes: %v", err)
	}

	srv := routes.Run(":3000")
	log.Println("Server is running on :3000")

	// wait for signal
	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("server shutdown error: %v", err)
	}
	routes.Close()
}
