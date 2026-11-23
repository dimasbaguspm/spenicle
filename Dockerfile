# Build the single static binary, then ship it on almost nothing.
FROM golang:1.26-alpine AS build

WORKDIR /src

# Dependencies first: this layer only rebuilds when go.mod/go.sum change.
COPY go.mod go.sum ./
RUN go mod download

COPY . .

ARG VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w -X main.version=${VERSION}" \
    -o /out/spenicle ./cmd/http

FROM alpine:3.22

# ca-certificates for outbound TLS (ECB rates, extraction provider), tzdata so
# TARGET business days and local dates behave.
RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S -g 10001 spenicle \
    && adduser -S -u 10001 -G spenicle spenicle \
    && mkdir -p /data \
    && chown spenicle:spenicle /data

COPY --from=build /out/spenicle /usr/local/bin/spenicle

USER spenicle
WORKDIR /data
VOLUME ["/data"]
EXPOSE 8080

ENV DATA_DIR=/data \
    ADDR=:8080

ENTRYPOINT ["/usr/local/bin/spenicle"]
