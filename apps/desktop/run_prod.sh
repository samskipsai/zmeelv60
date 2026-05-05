#!/bin/bash
# Run desktop app with PRODUCTION UI + PRODUCTION API
# UI: lite.zmeel.ai | API: lite.zmeel.ai
# This builds an unpacked app and runs it (no hot reload)

set -e

echo "Building unpacked app for production..."
pnpm -F @zmeel/desktop build:unpack

echo "Launching app with production configuration..."
ZMEEL_UI_URL=https://lite.zmeel.ai \
ZMEEL_API_URL=https://lite.zmeel.ai \
open apps/desktop/release/mac-arm64/Zmeel.app
