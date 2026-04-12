# JTextEditor

A minimal, modular text editor component built with Svelte 5 for embedding in Tauri web apps. Powered by CodeMirror 6 (plain text) and TipTap (rich text).

## Principles

- **Minimalism is law.** No abstraction without justification. No wrapper without purpose. Fewer files, fewer lines, fewer concepts.
- **Svelte 5 only.** Use `$state`, `$derived`, `$effect`, `$props`. Props down, callbacks up. Use `untrack()` in mount effects to prevent recreation loops.
- **Performance by default.** CodeMirror 6 for virtualized editing (million-line capable). Lezer for incremental syntax highlighting. Languages lazy-loaded via dynamic `import()`.
- **Standalone component.** No Tauri imports inside the component. File I/O through callback props. The component doesn't know or care what hosts it.
- **Modularity.** Each component does one thing. Shared infrastructure lives in `src/lib/`. No duplication — if it exists in two places, extract it.

## Architecture

```
src/
  JTextEditor.svelte        — Shell: tabs, keyboard shortcuts, layout, mode switching
  CodeMirrorEditor.svelte    — Thin Svelte 5 wrapper around CodeMirror 6
  RichTextEditor.svelte      — Thin Svelte 5 wrapper around TipTap
  TopBar.svelte              — Top bar: hamburger menu, breadcrumb, mode toggle, view dropdown
  TabBar.svelte              — Bottom tab pills
  lib/
    languages.js             — Single source of truth for language list
    characters.js            — Line ending detection
    cm-theme.js              — Dark theme (--jte-* CSS vars) + syntax highlight colors
    cm-setup.js              — Curated CM6 extensions bundle
    cm-languages.js          — Lazy language loader with dynamic import()
    cm-invisibles.js         — CM ViewPlugin for invisible character display
    cm-search-panel.js       — Custom CM search panel matching JTE FindBar design
    tiptap-cm-codeblock.js   — TipTap extension: CM6-powered code blocks in RTF mode
```

## Data flow

- Tab state owned by `JTextEditor`, passed as props to children
- Mode per tab: `'plain'` (CodeMirror) or `'rich'` (TipTap), toggled via TopBar
- Content sync: editors emit `onchange`, parent mutates tab. `$effect` with `untrack` + `lastEmitted` guard prevents recreation loops.
- Cursor position: `CodeMirrorEditor` → `oncursor` callback → `JTextEditor` → status bar
- Find/replace: CM's native search with custom panel (`cm-search-panel.js`), floating top-right
- CM reconfiguration: Compartments for language, line numbers, word wrap, active line, invisibles

## Key decisions

- CodeMirror 6 replaces textarea+Prism. Virtualized, incremental parsing, proper undo/redo.
- TipTap (ProseMirror-based) for rich text. CM6 code blocks inside RTF via custom NodeView.
- Shared CM infrastructure: `cm-theme.js` and `cm-languages.js` used by both standalone editor and TipTap code blocks.
- `untrack()` in mount `$effect` blocks — critical pattern. Without it, prop changes trigger full editor recreation.
- Google Material Symbols for all icons (loaded via CDN in host app).
- CSS custom properties (`--jte-*`) for all theming. CM theme uses `var()` references for runtime reactivity.

## Dev server

```bash
cd demo && npx vite
```

Demo app at `demo/src/App.svelte` with browser-native file open/save.
