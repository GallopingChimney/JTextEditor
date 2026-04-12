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
   - `find-replace` — CM: native search with custom panel (cm-search-panel.js). TipTap: tiptap-search.js plugin with same .jte-find UI. TopBar search button works in both modes. Ctrl+F with selection → panel under selection. Search open hides BubbleMenu via shouldShow callback.
   - `theme` — dark/light via data-theme attribute on .jte-root. Light overrides in JTextEditor.svelte CSS. CM syntax colors use var(--jte-syntax-*). Theme toggle button in bottom-right status bar (JTextEditor.svelte).
   - `page-view` — RTF-only: pageWidth (narrow 560px/normal 816px/wide 1280px/full) as icon-only button group in TopBar View dropdown. Fixed widths with horizontal scroll. Page color via --jte-page-color (defaults to --jte-menubar-bg), canvas via --jte-page-canvas. Color pickers in View dropdown with liveAction() for real-time preview.
   - `dirty-state` — tab.modified set on content change. Red * in breadcrumb (TopBar) and tab pill (TabBar). markSaved() resets.
   - `colors` — bgColor/pageCanvasColor/pageColor state in JTextEditor, injected as CSS vars on .jte-root. Page color controls --jte-page-color in page modes, --jte-bg in full mode. Canvas color only visible in page modes.
   - `syntax-highlighting` — CM Lezer parser, cm-theme.js highlight style (uses CSS vars), cm-languages.js lazy loader
   - `tabs` — multi-tab state, tab bar, active tab switching, content sync via lastEmitted guard
   - `file-io` — open/save callbacks, modified state, breadcrumb
   - `line-numbers` — CM lineNumbers() extension, toggled via Compartment
   - `word-wrap` — CM EditorView.lineWrapping, toggled via Compartment
   - `invisibles` — cm-invisibles.js ViewPlugin, toggled via Compartment
   - `mode-switching` — plain/rich toggle, conditional rendering in JTextEditor. Default mode is rich text.
   - `format-toolbar` — BubbleToolbar.svelte: unified bubble/pinned bar (default pinned). Responsive overflow at <620px. Heading, font, marks, link, color, highlight, alignment (incl. justify), lists, block tools, table/image insert. Table editing conditional on cursor in table.
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
- `JTextEditor.svelte` — owns tab state, view toggles, mode switching, color settings, CSS var injection, routes actions. Theme toggle in bottom-right status bar.
- `CodeMirrorEditor.svelte` — thin CM6 wrapper, Compartments for dynamic reconfig, exposes focusSearch/execCommand
- `RichTextEditor.svelte` — thin TipTap wrapper, CM6-powered code blocks, page view CSS, pinned toolbar default
- `BubbleToolbar.svelte` — unified format toolbar (bubble/pinned), responsive overflow, all formatting tools
- `TopBar.svelte` — hamburger menu, breadcrumb (with dirty indicator), mode toggle, view dropdown (page width button group, word wrap, color pickers)
- `TabBar.svelte` — tab pills (transparent bg, active = bottom border), dirty indicator
- `SlashMenu.svelte` — "/" command picker with scroll-into-view on keyboard nav
- `cm-search-panel.js` — custom CM search panel UI (floating FindBar design)
- `tiptap-search.js` — TipTap find/replace plugin (same .jte-find UI, ProseMirror decorations)
- Shared CM infra in `src/lib/cm-*.js`, shared language list in `src/lib/languages.js`

## Principles
- Keep the trace factual — read the actual code, don't guess
- Flag any circular dependencies or unclear ownership discovered during tracing
- If the feature touches more than 4 files, flag it as potentially over-complicated
