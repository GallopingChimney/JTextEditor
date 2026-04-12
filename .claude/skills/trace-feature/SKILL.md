---
name: trace-feature
description: Trace the full data flow of a JTextEditor feature — state ownership, props, callbacks, CSS, and event handlers.
user-invocable: true
argument-hint: [feature name, e.g. find-replace, tabs, syntax-highlighting, mode-switching]
allowed-tools: Read, Grep, Glob
---

# Trace Feature

Given a feature name, trace its complete implementation path through the codebase.

## Process

1. Identify the feature from the argument. Common features:
   - `find-replace` — CM's native search with custom panel (cm-search-panel.js), floating top-right
   - `syntax-highlighting` — CM Lezer parser, cm-theme.js highlight style, cm-languages.js lazy loader
   - `tabs` — multi-tab state, tab bar, active tab switching, content sync via lastEmitted guard
   - `file-io` — open/save callbacks, modified state, breadcrumb
   - `line-numbers` — CM lineNumbers() extension, toggled via Compartment
   - `word-wrap` — CM EditorView.lineWrapping, toggled via Compartment
   - `invisibles` — cm-invisibles.js ViewPlugin, toggled via Compartment
   - `mode-switching` — plain/rich toggle, conditional rendering in JTextEditor
   - `keyboard-shortcuts` — shell-level (save/new/close) vs editor-level (CM/TipTap own their keys)
   - `code-blocks` — CM6 inside TipTap via tiptap-cm-codeblock.js ProseMirror NodeView

2. For the identified feature, report:

   **State**: Where is the state owned? Which component? What `$state`/`$derived` variables?

   **Props flow**: How does data move between components? List each prop name and direction.

   **Callbacks**: What callbacks fire and in what order? Trace from user action to final state mutation.

   **CSS**: What classes and custom properties are involved?

   **Files touched**: Which files would need editing to modify this feature?

3. Output a concise diagram showing the flow, then list the specific file:line locations.

## Context

Architecture overview:
- `JTextEditor.svelte` — owns tab state, view toggles, mode switching, routes actions
- `CodeMirrorEditor.svelte` — thin CM6 wrapper, Compartments for dynamic reconfig, exposes focusSearch/execCommand
- `RichTextEditor.svelte` — thin TipTap wrapper, CM6-powered code blocks via tiptap-cm-codeblock.js
- `TopBar.svelte` — renders buttons, mode toggle, emits action strings via `onaction` callback
- `TabBar.svelte` — renders tab pills, emits select/close/new
- `cm-search-panel.js` — custom CM search panel UI (floating FindBar design)
- Shared CM infra in `src/lib/cm-*.js`, shared language list in `src/lib/languages.js`

## Principles
- Keep the trace factual — read the actual code, don't guess
- Flag any circular dependencies or unclear ownership discovered during tracing
- If the feature touches more than 4 files, flag it as potentially over-complicated
