#!/usr/bin/env bash
# Render build script — runs before gunicorn starts
set -e

echo "=== Step 1: Install frontend dependencies ==="
cd frontend
npm install

echo "=== Step 2: Build React app ==="
npm run build
echo "React build done → frontend/dist/"

echo "=== Step 3: Install backend dependencies ==="
cd ../backend
pip install -r requirements.txt

echo "=== Build complete ==="
