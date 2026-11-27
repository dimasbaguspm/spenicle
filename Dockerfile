# One build graph, four images: `latest` (API + worker + the SPA), `server` (the same binary
# without the SPA), `web` (the SPA alone, for a split deploy) and `cli` (the binary, no
# supervision). Whether the SPA is embedded is a *compile-time* tag, decided here and only
# here: a self-hoster cannot turn the UI on in a `server` image, because the bytes are not in
# it. The runtime image is a small Debian rather than distroless because runit needs a shell.

# The SPA build. Its output is what `-tags web` embeds, so nothing else has to copy it around.
FROM node:22-alpine AS spa

RUN corepack enable

WORKDIR /src/web

COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY web/ ./
RUN pnpm run build

FROM golang:1.26-alpine AS gosrc

WORKDIR /src

# Dependencies first: this layer only rebuilds when go.mod/go.sum change.
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# The headless binary: `server` and `cli` are built from this stage and never touch the SPA.
FROM gosrc AS build-api

ARG VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w -X github.com/dimasbaguspm/spenicle/internal/common/config.Version=${VERSION}" \
    -o /out/spenicle .

# The full binary: `web/dist` is embedded under the `web` build tag.
FROM gosrc AS build-spa

ARG VERSION=dev
# A build switch, not a runtime one. `off` is refused here on purpose: the headless binary is
# a different target (`--target server`), and there is no environment variable that could turn
# the UI on in an image whose bytes do not contain it.
ARG APP_WEB=on
RUN test "${APP_WEB}" != "off" \
    || { echo "APP_WEB=off builds the headless image: docker build --target server ." >&2; exit 1; }

COPY --from=spa /src/web/dist ./web/dist

RUN CGO_ENABLED=0 GOOS=linux go build \
    -tags web \
    -trimpath \
    -ldflags="-s -w -X github.com/dimasbaguspm/spenicle/internal/common/config.Version=${VERSION}" \
    -o /out/spenicle .

# Supervised runtime: both processes, one container, one SQLite file.
FROM debian:13-slim AS runtime

# ca-certificates for outbound TLS (ECB rates, extraction provider), tzdata so the
# APP_TIMEZONE business-day shift behaves, runit to supervise the two processes.
RUN apt-get update \
    && apt-get install --no-install-recommends -y ca-certificates tzdata runit \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --uid 10001 --user-group --home-dir /data --shell /usr/sbin/nologin spenicle \
    && mkdir -p /data \
    && chown spenicle:spenicle /data

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

# The headless server: same API, same worker, no SPA bytes at all.
FROM runtime AS server
COPY --from=build-api /out/spenicle /spenicle

# The CLI: the binary and nothing else, so `docker run … server migrate` style commands work.
FROM debian:13-slim AS cli
RUN apt-get update \
    && apt-get install --no-install-recommends -y ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /data
COPY --from=build-api /out/spenicle /spenicle
ENTRYPOINT ["/spenicle"]

# The SPA alone, for a split deploy: nginx serves the same `dist` the full image embeds.
FROM nginx:1.27-alpine AS web
COPY config/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=spa /src/web/dist /usr/share/nginx/html
EXPOSE 8080

# The default target, and therefore a bare `docker build .`: the whole distribution.
FROM runtime AS latest
COPY --from=build-spa /out/spenicle /spenicle
