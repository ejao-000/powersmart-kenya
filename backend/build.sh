#!/bin/sh
# PowerSmart Kenya — backend build script (run from the backend/ root directory).
# Builds the Go API server binary. The frontend is built separately (frontend/build.sh).
set -e

echo "==> Building Go API server..."
go build -o powersmart .

echo "==> Build complete: ./backend/powersmart"
