// docker buildx bake: one invocation, four images, shared stages.
//
// The Dockerfile's `gosrc`, `spa` and `runtime` stages are built once and reused, so
// publishing four targets costs what publishing one costs plus the copy layers.
variable "REGISTRY" {
  default = "ghcr.io"
}

variable "REPO" {
  default = "dimasbaguspm/spenicle"
}

variable "VERSION" {
  default = "dev"
}

variable "SHORT" {
  default = "dev"
}

variable "SHA7" {
  default = "dev"
}

target "common" {
  context   = "."
  platforms = ["linux/amd64", "linux/arm64"]
  args = {
    VERSION = "${VERSION}"
  }
}

# The whole product: API, worker and the embedded SPA.
target "latest" {
  inherits = ["common"]
  target   = "latest"
  tags = [
    "${REGISTRY}/${REPO}:${VERSION}",
    "${REGISTRY}/${REPO}:${SHORT}",
    "${REGISTRY}/${REPO}:sha-${SHA7}",
    "${REGISTRY}/${REPO}:latest",
  ]
  labels = {
    "org.opencontainers.image.version"  = "${VERSION}"
    "org.opencontainers.image.revision" = "${SHA7}"
  }
}

# The headless server: same processes, no SPA bytes.
target "server" {
  inherits = ["common"]
  target   = "server"
  tags = [
    "${REGISTRY}/${REPO}:server",
    "${REGISTRY}/${REPO}:sha-${SHA7}-server",
  ]
}

# The SPA alone, on nginx, for a split deploy.
target "web" {
  inherits = ["common"]
  target   = "web"
  tags = [
    "${REGISTRY}/${REPO}:web",
    "${REGISTRY}/${REPO}:sha-${SHA7}-web",
  ]
}

# The binary with no supervisor, for one-shot jobs.
target "cli" {
  inherits = ["common"]
  target   = "cli"
  tags = [
    "${REGISTRY}/${REPO}:cli",
    "${REGISTRY}/${REPO}:sha-${SHA7}-cli",
  ]
}

group "default" {
  targets = ["latest", "server", "web", "cli"]
}
