FROM golang:1.25-alpine AS backend-builder
WORKDIR /build
RUN apk add --no-cache git
COPY apps/backend/go.mod apps/backend/go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY apps/backend/ ./
RUN CGO_ENABLED=0 GOOS=linux IS_DEV_ENV=false go build -a -installsuffix cgo -ldflags="-w -s" -o /app/spenicle-api ./cmd/app

FROM golang:1.25-alpine AS snapexchange-builder
WORKDIR /build
RUN apk add --no-cache git
COPY apps/backend-snap-exchange/go.mod apps/backend-snap-exchange/go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY apps/backend-snap-exchange/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags="-w -s" -o /app/snapexchange ./cmd/app

FROM golang:1.25-alpine AS proxy-builder
WORKDIR /build
COPY deploy/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags="-w -s" -o /app/proxy main.go

FROM oven/bun:1-alpine AS web-builder
WORKDIR /build
ARG WEB_APP_VERSION
ENV VITE_WEB_APP_VERSION=$WEB_APP_VERSION
COPY apps/frontend-web/package.json apps/frontend-web/bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile
COPY apps/frontend-web/ ./
ENV NODE_ENV=production
RUN bun run build

FROM gcr.io/distroless/static
WORKDIR /app
ENV WEB_PORT=3000
ENV APP_PORT=8080
ENV SNAPEXCHANGE_PORT=8081
ENV DIST_PATH=/app/frontend-web/dist
ENV BACKEND_PATH=/app/spenicle-api
ENV SNAPEXCHANGE_PATH=/app/snapexchange
ENV SNAP_EXCHANGE_URL=http://localhost:8081

COPY --from=backend-builder /app/spenicle-api /app/spenicle-api
COPY --from=backend-builder /build/migrations /app/migrations
COPY --from=snapexchange-builder /app/snapexchange /app/snapexchange
COPY --from=proxy-builder /app/proxy /app/proxy
COPY --from=web-builder /build/dist /app/frontend-web/dist

EXPOSE ${WEB_PORT}
CMD ["/app/proxy"]
