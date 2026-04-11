---
name: audit-components
description: Audit JTextEditor for dead code, duplication, Svelte 4 patterns, and architectural issues.
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash
---

# Audit Components

Run a health check on the JTextEditor codebase.

## Checks to perform

### 1. Dead components
- Read `src/index.js` exports and `src/JTextEditor.svelte` imports
- Glob `src/**/*.svelte` and flag any `.svelte` file not imported by anything
- Check `src/lib/*.js` — flag exports not used anywhere

### 2. Duplication
- Grep for repeated constant arrays (language lists, action lists, icon lists)
- Grep for repeated utility functions (escapeHtml, etc.)
- Any constant or list should exist in exactly one place in `src/lib/`

### 3. Svelte 4 anti-patterns
- Grep for `export function` or `export let` in `.svelte` files (should use `$props`)
- Grep for `on:click`, `on:input` etc. (should be `onclick`, `oninput`)
- Grep for `$:` reactive statements (should use `$derived` or `$effect`)
- Grep for `bind:this` used to call methods on child components (use props/callbacks instead)
- Grep for `createEventDispatcher`

### 4. Architecture
- Verify data flows one direction: props down, callbacks up
- Check no component imports from Tauri or other host-specific APIs
- Verify CSS uses `--jte-*` custom properties, not hardcoded colors that should be themeable

## Output
Report as a checklist: pass/fail for each check, with file:line for any issues found.

## Principles to enforce
- Minimalism: flag unnecessary wrappers, abstractions, or indirection
- Single responsibility: each component should do one thing
- No speculation: flag code that exists "for the future" without current use (except RichTextEditor.svelte which is an acknowledged stub)
