FROM golang:1.25-alpine AS backend-builder

WORKDIR /build

RUN apk add --no-cache git

COPY apps/backend/go.mod apps/backend/go.sum ./
RUN go mod download
COPY apps/backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o /app/spenicle-api ./cmd/app

FROM oven/bun:1-alpine AS web-builder

WORKDIR /build

COPY apps/web/package.json apps/web/bun.lock apps/web/bunfig.toml ./
RUN bun install --frozen-lockfile
COPY apps/web/ ./
RUN bun run build

FROM alpine:3.19

WORKDIR /app

RUN apk add --no-cache \
    ca-certificates \
    curl \
    tzdata \
    supervisor \
    nginx \
    && rm -rf /var/cache/apk/*

COPY --from=oven/bun:1-alpine /usr/local/bin/bun /usr/local/bin/bun

COPY --from=backend-builder /app/spenicle-api /app/spenicle-api
COPY --from=backend-builder /build/internal/database/migrations /app/internal/database/migrations

COPY --from=web-builder /build/dist /app/web/dist
COPY --from=web-builder /build/cmd /app/web/cmd
COPY --from=web-builder /build/package.json /app/web/package.json

COPY scripts/supervisord.conf /etc/supervisord.conf

# Nginx config to serve frontend static assets
COPY scripts/nginx.conf /etc/nginx/nginx.conf

# Copy entrypoint script (use runtime env vars passed to container)
COPY scripts/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose ports
EXPOSE 8080 3000

ENTRYPOINT ["/app/entrypoint.sh"]
