#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
UI_DIR="$ROOT_DIR/ui/v2.5"
BUILD_DIR="$UI_DIR/build"
OUTPUT_DIR="${UI_UPDATE_OUTPUT_DIR:-$ROOT_DIR/dist/ui-updates}"

TIMESTAMP=$(date -u +%Y%m%d%H%M%S)
GIT_HASH="nogit"
if git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  GIT_HASH=$(git -C "$ROOT_DIR" rev-parse --short HEAD)
fi

VERSION="${UI_UPDATE_VERSION:-${TIMESTAMP}-${GIT_HASH}}"
ARCHIVE_NAME="stash-ui-v2.5-${VERSION}.tar.gz"
ARCHIVE_PATH="$OUTPUT_DIR/$ARCHIVE_NAME"

if [[ ! -d "$UI_DIR/node_modules" ]]; then
  echo "UI dependencies not found. Running 'make pre-ui'..."
  make -C "$ROOT_DIR" pre-ui
fi

echo "Building UI..."
make -C "$ROOT_DIR" ui

if [[ ! -d "$BUILD_DIR" ]]; then
  echo "Expected build output at $BUILD_DIR, but it was not found." >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

tar -C "$BUILD_DIR" -czf "$ARCHIVE_PATH" .

echo "UI update archive created: $ARCHIVE_PATH"
