#!/usr/bin/env bash
# Build data/pois.json inside a throwaway Python container (no local Python needed).
# Args are passed through to build_data.py, e.g:
#   scripts/build_data.sh cities5000 peaks
set -euo pipefail
cd "$(dirname "$0")/.."

docker run --rm \
  -v "$PWD:/app" -w /app \
  python:3.12-slim \
  python scripts/build_data.py "$@"

echo "Done. Update the data URL in js/main.js -> loadPois('data/pois.json') to use it."
