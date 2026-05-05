#!/bin/bash
# Run desktop app with LOCAL UI (Vite hot reload) + PRODUCTION API
# UI: localhost:5173 | API: lite.zmeel.ai
ZMEEL_UI_URL=http://localhost:3000 ZMEEL_API_URL=https://lite.zmeel.ai pnpm dev
