# sdf-desktop

Etapsky — Smart Document Workstation (Tauri + React).

## App vs `.sdf` file icons

| Asset | Role |
|--------|------|
| [`assets/fennec-fox-app-icon.svg`](assets/fennec-fox-app-icon.svg) | **Application** icon (from `fennec-fox.svg` + opaque plate for Dock/taskbar) → `pnpm exec tauri icon …` → `src-tauri/icons/icon.icns`, `icon.ico`, PNGs |
| [`assets/sdf_icon.svg`](assets/sdf_icon.svg) | **`.sdf` document** type → `SDFDocument.icns` / `SDFDocument.ico` (bundled via `tauri.conf.json` → `bundle.resources`) |

Regenerate both from SVG (e.g. after logo tweaks):

```bash
pnpm icons
```

This matches the pipeline in [`sdf/tooling/os-integration/macos/generate-icon.py`](../sdf/tooling/os-integration/macos/generate-icon.py) (ICNS/ICO from SVG), and the Homebrew [`SDFDocument.icns`](../homebrew-tap/Formula/sdf.rb) story for the CLI tarball — same visual identity, different packaging context.

**macOS:** `src-tauri/Info.plist` is merged by Tauri and declares `UTExportedTypeDeclarations` / `UTTypeIconFile` for `com.etapsky.sdf` so Finder can show the document icon when the UTI is active.

**Windows:** File-type UI depends on the installer’s registry entries; `SDFDocument.ico` is included in app resources for use by the bundle or custom WiX/NSIS steps if you extend the installer later.
