---
name: test-editor
description: Start the JTextEditor dev server for testing. Kills stale Vite processes, runs a build check, then starts fresh.
user-invocable: true
---

# Test Editor

Start the dev server for JTextEditor.

## Steps

1. Run `cd C:/Users/Felix/Workshop/JTextEditor/demo && npx vite build 2>&1` to check for build errors. If there are errors, report them and stop.
2. Kill any existing Vite processes on ports 5173-5180: `netstat -ano | grep -E ':517[0-9] ' | grep LISTENING | awk '{print $5}' | sort -u | xargs -I{} taskkill //PID {} //F 2>&1`
3. Tell the user to run `cd C:/Users/Felix/Workshop/JTextEditor/demo && npx vite` in their terminal (Vite exits when run in non-interactive background shells on Windows).
4. Report the expected URL (http://localhost:5173/) and remind them to check the terminal for the actual port if 5173 is taken.

## Context

- Project root: `C:/Users/Felix/Workshop/JTextEditor`
- Demo app: `demo/src/App.svelte`
- The demo uses browser-native File System Access API for open/save
- Material Symbols font loaded via CDN in `demo/index.html`
- Always check build first — a broken build wastes time
- Editor engines: CodeMirror 6 (plain text mode), TipTap (rich text mode)
- Mode toggle in TopBar switches between plain/rich per tab
