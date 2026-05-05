#!/bin/bash
# Run desktop app with STAGING UI + STAGING API
# UI: lite-staging.zmeel.ai | API: lite-staging.zmeel.ai
# This builds an unpacked app and runs it (no hot reload)

set -e

echo "Building unpacked app for staging..."
pnpm -F @zmeel/desktop build:unpack

echo "Launching app with staging configuration..."
ZMEEL_UI_URL=https://lite-staging.zmeel.ai \
ZMEEL_API_URL=https://lite-staging.zmeel.ai \
open apps/desktop/release/mac-arm64/Zmeel.app
