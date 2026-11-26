.PHONY: build clean install test cross-compile compress release dev fmt lint help

# Read version from VERSION file
VERSION := $(shell cat VERSION 2>/dev/null || echo "dev")
BINARY_NAME = oqm
BUILD_DIR = build
MIPSLE_ENV = GOOS=linux GOARCH=mipsle GOMIPS=softfloat CGO_ENABLED=0
LDFLAGS = -s -w -X main.version=$(VERSION)

# Build for current platform (useful for local development)
build:
	@mkdir -p $(BUILD_DIR)
	@echo "Building $(BINARY_NAME) for the current platform..."
	go build -ldflags="$(LDFLAGS)" -o $(BUILD_DIR)/$(BINARY_NAME) ./cmd/oqm

# The only release target: Linux MIPS little-endian OpenWrt routers
cross-compile:
	@mkdir -p $(BUILD_DIR)
	@echo "Building $(BINARY_NAME) for linux/mipsle (soft-float)..."
	$(MIPSLE_ENV) go build -ldflags="$(LDFLAGS)" -o $(BUILD_DIR)/$(BINARY_NAME)-mipsle ./cmd/oqm

# Compress the MIPSLE release binary with UPX (optional)
compress: cross-compile
	@command -v upx >/dev/null 2>&1 || { echo "UPX not available; skipping compression"; exit 0; }
	upx --best --lzma $(BUILD_DIR)/$(BINARY_NAME)-mipsle

install: build
	@echo "Installing $(BINARY_NAME) to /usr/local/bin..."
	sudo install -m 0755 $(BUILD_DIR)/$(BINARY_NAME) /usr/local/bin/$(BINARY_NAME)

clean:
	@echo "Cleaning build artifacts..."
	rm -rf $(BUILD_DIR)
	go clean

test:
	go test -v ./...

release: cross-compile
	@echo "Creating MIPSLE release archive..."
	@mkdir -p $(BUILD_DIR)/release
	tar -czf $(BUILD_DIR)/release/$(BINARY_NAME)-$(VERSION)-mipsle.tar.gz \
		-C $(BUILD_DIR) $(BINARY_NAME)-mipsle \
		-C ../openwrt/files/etc/init.d oqm \
		-C ../../../ README.md
	@echo "Created $(BUILD_DIR)/release/$(BINARY_NAME)-$(VERSION)-mipsle.tar.gz"

dev:
	@mkdir -p $(BUILD_DIR)
	go build -race -o $(BUILD_DIR)/$(BINARY_NAME)-dev ./cmd/oqm

fmt:
	go fmt ./...
	goimports -w .

lint:
	golangci-lint run ./...

help:
	@echo "Available targets:"
	@echo "  build          - Build for the current development platform"
	@echo "  cross-compile  - Build the linux/mipsle OpenWrt binary"
	@echo "  compress       - Cross-compile and optionally compress with UPX"
	@echo "  install        - Install the local development build"
	@echo "  clean          - Clean build artifacts"
	@echo "  test           - Run tests"
	@echo "  release        - Create the MIPSLE release archive"
	@echo "  dev            - Build with race detector"
	@echo "  fmt            - Format code"
	@echo "  lint           - Lint code"
