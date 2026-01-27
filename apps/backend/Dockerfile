# Development stage
FROM golang:1.25-alpine AS dev
ARG APP_PORT
ARG IS_DEV_ENV
WORKDIR /app
RUN go install github.com/air-verse/air@latest
COPY go.mod go.sum ./
RUN go mod download
COPY air.toml ./
EXPOSE ${APP_PORT}
CMD ["air", "-c", "air.toml"]


# Build Prod stage
FROM golang:1.25-alpine AS builder
ARG APP_PORT
ARG IS_DEV_ENV
RUN apk add --no-cache git ca-certificates
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o spenicle-api ./cmd/app/main.go

# Runtime stage
FROM alpine:latest AS runtime
RUN apk --no-cache add ca-certificates tzdata
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser
WORKDIR /app
COPY --from=builder /app/spenicle-api .
COPY --from=builder /app/migrations ./migrations
RUN chown -R appuser:appuser /app
USER appuser
EXPOSE ${APP_PORT}
CMD ["./spenicle-api"]
