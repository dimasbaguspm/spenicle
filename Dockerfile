# Build the static binary, then supervise the API and the worker on a small base
# image: runit needs a shell, which is why the runtime stage is not distroless.
FROM golang:1.26-alpine AS build

WORKDIR /src

# Dependencies first: this layer only rebuilds when go.mod/go.sum change.
COPY go.mod go.sum ./
RUN go mod download

COPY . .

ARG VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w -X github.com/dimasbaguspm/spenicle/internal/common/config.Version=${VERSION}" \
    -o /out/spenicle .

FROM debian:13-slim

# ca-certificates for outbound TLS (ECB rates, extraction provider), tzdata so
# TARGET business days and local dates behave, runit to supervise the two
# processes in one container.
RUN apt-get update \
    && apt-get install --no-install-recommends -y ca-certificates tzdata runit \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --uid 10001 --user-group --home-dir /data --shell /usr/sbin/nologin spenicle \
    && mkdir -p /data \
    && chown spenicle:spenicle /data

COPY --from=build /out/spenicle /spenicle
COPY config/runit/spenicle-http /etc/service/spenicle-http
COPY config/runit/spenicle-worker /etc/service/spenicle-worker

RUN chmod 755 /etc/service/*/run /etc/service/*/finish

# The data dir is fixed (./data) and relative, so the working directory decides where
# it lands: /data here, which is the volume. No DATA_DIR and no ADDR to configure.
WORKDIR /
VOLUME ["/data"]
EXPOSE 8080

# runsvdir stays PID 1 as root and starts one runsv per service directory; each
# run script drops to uid 10001 through chpst.
ENTRYPOINT ["/usr/bin/runsvdir", "-P", "/etc/service"]
