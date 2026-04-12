---
name: test-editor
description: Start the JTextEditor dev server for testing. Kills stale Vite processes, runs a build check, then starts fresh.
user-invocable: true
---

# Test Editor

Start a dev server for JTextEditor. Two modes available:

## Browser Demo (default)

1. Run `cd C:/Users/Felix/Workshop/JTextEditor/demo && npx vite build 2>&1` to check for build errors. If there are errors, report them and stop.
2. Kill any existing Vite processes on ports 5173-5180: `netstat -ano | grep -E ':517[0-9] ' | grep LISTENING | awk '{print $5}' | sort -u | xargs -I{} taskkill //PID {} //F 2>&1`
3. Tell the user to run `cd C:/Users/Felix/Workshop/JTextEditor/demo && npx vite` in their terminal (Vite exits when run in non-interactive background shells on Windows).
4. Report the expected URL (http://localhost:5173/) and remind them to check the terminal for the actual port if 5173 is taken.

## Standalone Tauri App

1. Run `cd C:/Users/Felix/Workshop/JTextEditor/app && npx vite build 2>&1` to check for frontend build errors. If there are errors, report them and stop.
2. Tell the user to run `npm run dev:app` from the project root. This starts both the Vite frontend (port 1420) and the Tauri Rust backend with HMR.
3. First launch compiles the Rust backend (~2-3 min), subsequent launches are fast.
4. The app opens as a standalone window with custom titlebar (no native decorations), mode="app".

## Context

- Project root: `C:/Users/Felix/Workshop/JTextEditor`
- Browser demo: `demo/src/App.svelte` — browser-native File System Access API for open/save
- Tauri app: `app/src/App.svelte` — standalone window with `mode="app"`, reads `--file` CLI arg
- Tauri backend: `src-tauri/` — Rust, plugins: cli + fs
- Material Symbols font loaded via CDN in both `demo/index.html` and `app/index.html`
- Always check build first — a broken build wastes time
- Editor engines: CodeMirror 6 (plain text mode), TipTap (rich text mode)
- Mode toggle in TopBar switches between plain/rich per tab
- `mode` prop on JTextEditor: `'sidecar'` (default, embedded) or `'app'` (standalone window with window controls)
