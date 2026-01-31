package configs

import (
	"context"
	"log/slog"
	"os"

	"github.com/redis/go-redis/v9"
)

func NewRedisClient(ctx context.Context, env Environment) *redis.Client {
	slog.Info("Initializing Redis Client")

	rdb := redis.NewClient(&redis.Options{
		Addr: env.RedisURL,
	})

	slog.Info("Connecting to Redis", "url", env.RedisURL)

	pong, err := rdb.Ping(ctx).Result()
	if err != nil {
		slog.Error("Failed to connect to Redis", "error", err)
		os.Exit(1)
	}

	slog.Info("Connected to Redis", "response", pong)

	return rdb
}
