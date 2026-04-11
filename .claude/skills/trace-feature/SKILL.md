---
name: trace-feature
description: Trace the full data flow of a JTextEditor feature — state ownership, props, callbacks, CSS, and event handlers.
user-invocable: true
argument-hint: [feature name, e.g. find-replace, tabs, syntax-highlighting]
allowed-tools: Read, Grep, Glob
---

# Trace Feature

Given a feature name, trace its complete implementation path through the codebase.

## Process

1. Identify the feature from the argument. Common features:
   - `find-replace` — search, match highlighting, replace single/all, match options
   - `line-highlight` — current line background + active gutter number
   - `syntax-highlighting` — Prism overlay, language selection, token colors
   - `tabs` — multi-tab state, tab bar, active tab switching
   - `file-io` — open/save callbacks, modified state, breadcrumb
   - `line-numbers` — gutter rendering, scroll sync
   - `word-wrap` — toggle, CSS changes
   - `keyboard-shortcuts` — all keybindings and where they're handled

2. For the identified feature, report:

   **State**: Where is the state owned? Which component? What `$state`/`$derived` variables?

   **Props flow**: How does data move between components? List each prop name and direction.

   **Callbacks**: What callbacks fire and in what order? Trace from user action to final state mutation.

   **CSS**: What classes and custom properties are involved?

   **Files touched**: Which files would need editing to modify this feature?

3. Output a concise diagram showing the flow, then list the specific file:line locations.

## Context

Architecture overview:
- `JTextEditor.svelte` — owns tab state, view toggles, find state, routes actions
- `PlainTextEditor.svelte` — owns textarea, overlay, cursor tracking, find execution
- `TopBar.svelte` — renders buttons, emits action strings via `onaction` callback
- `FindBar.svelte` — owns search/replace input state, emits find actions, displays match count
- `TabBar.svelte` — renders tab pills, emits select/close/new
- Shared data in `src/lib/languages.js` and `src/lib/characters.js`

## Principles
- Keep the trace factual — read the actual code, don't guess
- Flag any circular dependencies or unclear ownership discovered during tracing
- If the feature touches more than 4 files, flag it as potentially over-complicated
