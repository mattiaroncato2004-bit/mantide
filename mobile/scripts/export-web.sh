#!/usr/bin/env bash
# Builds the web demo for GitHub Pages: served at /mantide/, so every asset path needs that prefix.
# .nojekyll stops Pages from hiding the _expo/ folder (Jekyll skips folders starting with "_").
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist-web
EXPO_BASE_URL=/mantide npx expo export --platform web --output-dir dist-web
touch dist-web/.nojekyll
