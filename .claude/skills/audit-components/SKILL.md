---
name: audit-components
description: Audit JTextEditor for dead code, duplication, Svelte 4 patterns, and architectural issues.
user-invocable: true
---

# Audit Components

Run a health check on the JTextEditor codebase.

## Checks to perform

### 1. Dead components
- Read `src/index.js` exports and `src/JTextEditor.svelte` imports
- Glob `src/**/*.svelte` and flag any `.svelte` file not imported by anything
- Check `src/lib/*.js` — flag exports not used anywhere
- Note: `.svelte.archived` files are intentionally preserved and should be ignored

### 2. Duplication
- Grep for repeated constant arrays (language lists, character maps)
- Grep for repeated utility functions
- Any constant or list should exist in exactly one place in `src/lib/`
- Check that CM theme colors aren't duplicated between `cm-theme.js` and component styles

### 3. Svelte 4 anti-patterns
- Grep for `export let` in `.svelte` files (should use `$props`)
- Grep for `on:click`, `on:input` etc. (should be `onclick`, `oninput`)
- Grep for `$:` reactive statements (should use `$derived` or `$effect`)
- Grep for `createEventDispatcher`

### 4. Architecture
- Verify data flows one direction: props down, callbacks up
- Check no `src/` component imports from Tauri or other host-specific APIs (Tauri imports are only allowed in `app/`)
- Verify CSS uses `--jte-*` custom properties, not hardcoded colors that should be themeable
- Verify mount `$effect` blocks use `untrack()` to avoid recreation loops
- Check that CM Compartments are used for dynamic reconfiguration (not editor recreation)

### 5. Editor boundaries
- CodeMirror and TipTap own their own keyboard handling — verify no shell-level handlers intercept editor keys
- Shell `handleKeydown` should only catch app-level shortcuts (save, new, close, open)
- Verify `lastEmitted` guard exists in both `CodeMirrorEditor` and `RichTextEditor` content sync

## Output
Report as a checklist: pass/fail for each check, with file:line for any issues found.

## Principles to enforce
- Minimalism: flag unnecessary wrappers, abstractions, or indirection
- Single responsibility: each component should do one thing
- No speculation: flag code that exists "for the future" without current use
