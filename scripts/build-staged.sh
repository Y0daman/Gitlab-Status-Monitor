#!/usr/bin/env bash
set -euo pipefail

# Build installers through a staging directory on an APFS volume, then copy the
# finished artifacts back into ./dist.
#
# Why: when the repository lives on a filesystem without extended-attribute
# support (e.g. ExFAT), macOS stores xattrs in "._*" AppleDouble sidecar files.
# electron-builder 26 treats every "*_*.asar"-suffixed file in the app
# Resources as an ASAR archive when computing the ASAR integrity hash, so a
# "._app.asar" sidecar crashes the build with a "value of offset is out of
# range" RangeError. Staging the build on APFS avoids the sidecar files
# entirely and keeps ./dist as the final artifact location.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist"
STAGE="$(mktemp -d -t gsm-build)"

cleanup() {
  rm -rf "$STAGE"
}
trap cleanup EXIT

echo "Cleaning macOS metadata sidecar files (._*)"
find "$ROOT" -name '._*' -type f -not -path "$ROOT/node_modules/*" -not -path "$ROOT/.git/*" -delete

echo "Packaging with output to staging dir: $STAGE"
"$ROOT/node_modules/.bin/electron-builder" "$@" -c.directories.output="$STAGE"

echo "Copying artifacts to $DIST"
mkdir -p "$DIST"
cp -R "$STAGE"/. "$DIST"/

echo "Done. Artifacts:"
ls -1 "$DIST"
