#!/usr/bin/env bash
# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
# Regenerate bundle icons from repo assets/ (same sources as tooling/os-integration/generate-icon.py).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ App icon (Dock / taskbar): assets/fennec-fox.svg → src-tauri/icons/"
pnpm exec tauri icon assets/fennec-fox.svg

TMP="$ROOT/src-tauri/icons/.sdf-doc-icon-build"
rm -rf "$TMP"
mkdir -p "$TMP"
echo "→ Document type icon (.sdf): assets/sdf_icon.svg → SDFDocument.icns / SDFDocument.ico"
pnpm exec tauri icon assets/sdf_icon.svg -o "$TMP"
mv "$TMP/icon.icns" "$ROOT/src-tauri/icons/SDFDocument.icns"
mv "$TMP/icon.ico" "$ROOT/src-tauri/icons/SDFDocument.ico"
rm -rf "$TMP"

echo "Done."
