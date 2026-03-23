#!/usr/bin/env bash
set -euo pipefail

echo "Cleaning macOS metadata sidecar files"
find . -name '._*' -type f -delete || true

echo "Installing dependencies"
npm install

echo "Running tests"
npm test

case "$(uname -s)" in
  Darwin)
    echo "Building macOS installer"
    npm run build:mac
    ;;
  Linux)
    echo "Building Linux packages"
    npm run build:linux
    ;;
  MINGW*|MSYS*|CYGWIN*)
    echo "Building Windows installer"
    npm run build:win
    ;;
  *)
    echo "Unknown platform, running generic build"
    npm run build
    ;;
esac

echo "Done"
