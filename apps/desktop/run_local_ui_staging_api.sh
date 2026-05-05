#!/bin/bash
# Run desktop app with LOCAL UI (Vite hot reload) + STAGING API
# UI: localhost:5173 | API: lite-staging.zmeel.ai
ZMEEL_UI_URL=http://localhost:3000 ZMEEL_API_URL=https://lite-staging.zmeel.ai pnpm dev
