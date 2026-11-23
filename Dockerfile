# Build the static binary, then supervise the API and the worker on a small base
# image: s6-overlay needs a shell, which is why the runtime stage is not distroless.
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

FROM alpine:3.22

ARG S6_OVERLAY_VERSION=3.2.1.0

# Digests published with the v3.2.1.0 release (the .sha256 files next to each
# tarball). They are pinned here so the download is verified offline, before
# anything is extracted: a payload that does not match fails the build.
ARG S6_OVERLAY_NOARCH_SHA256=42e038a9a00fc0fef70bf0bc42f625a9c14f8ecdfe77d4ad93281edf717e10c5
ARG S6_OVERLAY_X86_64_SHA256=8bcbc2cada58426f976b159dcc4e06cbb1454d5f39252b3bb0c778ccf71c9435
ARG S6_OVERLAY_AARCH64_SHA256=c8fd6b1f0380d399422fc986a1e6799f6a287e2cfa24813ad0b6a4fb4fa755cc

# ca-certificates for outbound TLS (ECB rates, extraction provider), tzdata so
# TARGET business days and local dates behave, xz to unpack s6-overlay.
RUN apk add --no-cache ca-certificates tzdata xz \
    && case "$(uname -m)" in \
         x86_64) s6_arch=x86_64; s6_sha="${S6_OVERLAY_X86_64_SHA256}" ;; \
         aarch64) s6_arch=aarch64; s6_sha="${S6_OVERLAY_AARCH64_SHA256}" ;; \
         *) echo "unsupported architecture $(uname -m)" >&2; exit 1 ;; \
       esac \
    && wget -qO /tmp/s6-noarch.tar.xz \
         "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz" \
    && wget -qO /tmp/s6-arch.tar.xz \
         "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${s6_arch}.tar.xz" \
    && echo "${S6_OVERLAY_NOARCH_SHA256}  /tmp/s6-noarch.tar.xz" | sha256sum -c - \
    && echo "${s6_sha}  /tmp/s6-arch.tar.xz" | sha256sum -c - \
    && xz -dc /tmp/s6-noarch.tar.xz | tar -xpf - -C / \
    && xz -dc /tmp/s6-arch.tar.xz | tar -xpf - -C / \
    && rm -f /tmp/s6-*.tar.xz \
    && addgroup -S -g 10001 spenicle \
    && adduser -S -u 10001 -G spenicle spenicle \
    && mkdir -p /data \
    && chown spenicle:spenicle /data

COPY --from=build /out/spenicle /spenicle
COPY config/s6/s6-rc.d /etc/s6-overlay/s6-rc.d

RUN chmod 755 /etc/s6-overlay/s6-rc.d/*/run /etc/s6-overlay/s6-rc.d/*/finish

WORKDIR /data
VOLUME ["/data"]
EXPOSE 8080

ENV PATH=/command:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    DATA_DIR=/data \
    ADDR=:8080

ENTRYPOINT ["/init"]
