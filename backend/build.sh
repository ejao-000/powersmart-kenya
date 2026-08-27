#!/bin/sh
# PowerSmart Kenya — Render build script (run from the backend/ root directory).
# Builds the frontend (Vite output) first, then the Go server binary.
set -e

echo "==> Building frontend..."
cd ../frontend
npm install --no-audit --no-fund
npm run build

echo "==> Building Go server..."
cd ../backend
go build -o powersmart .

echo "==> Build complete: ./backend/powersmart"
