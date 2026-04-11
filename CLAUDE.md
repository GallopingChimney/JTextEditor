# JTextEditor

A minimal, modular text editor component built with Svelte 5 for embedding in Tauri web apps.

## Principles

- **Minimalism is law.** No abstraction without justification. No wrapper without purpose. Fewer files, fewer lines, fewer concepts.
- **Svelte 5 only.** Use `$state`, `$derived`, `$effect`, `$props`. No `export function` on components, no `on:click` directives, no stores. Props down, callbacks up.
- **Performance by default.** Textarea + overlay for rendering. Prism.js for syntax highlighting. No heavy frameworks. Architecture should support virtualized scrolling for large files in the future.
- **Standalone component.** No Tauri imports inside the component. File I/O through callback props. The component doesn't know or care what hosts it.
- **Modularity.** Each component does one thing. Shared data (languages, characters) lives in `src/lib/`. No duplication — if it exists in two places, extract it.

## Architecture

```
src/
  JTextEditor.svelte      — Shell: tabs, find state, keyboard shortcuts, layout
  PlainTextEditor.svelte   — Core: textarea + Prism overlay, line numbers, find highlights
  TopBar.svelte            — Top bar: hamburger menu, breadcrumb, action buttons, view dropdown
  TabBar.svelte            — Bottom tab pills
  FindBar.svelte           — Floating find/replace with match options
  RichTextEditor.svelte    — Future RTF mode (currently hidden)
  lib/
    languages.js           — Single source of truth for language list
    characters.js          — Line ending detection, invisible char maps
    pell.js                — Pell core for future RTF mode
```

## Data flow

- Tab state owned by `JTextEditor`, passed as props to children
- Find actions: `FindBar` → callback → `JTextEditor` → `findAction` prop → `PlainTextEditor.$effect`
- Cursor position: `PlainTextEditor` → `oncursor` callback → `JTextEditor` → bottom bar
- Match index: `PlainTextEditor` → `onmatchchange` → `JTextEditor` → `FindBar`
- Content: `PlainTextEditor` → `onchange` → `JTextEditor` mutates active tab

## Key decisions

- Overlay approach for syntax highlighting: textarea text is transparent, `<pre>` behind renders colored spans. Same characters, no alignment drift.
- `_tick: Date.now()` on findAction objects to deduplicate `$effect` runs.
- Google Material Symbols for all icons (loaded via CDN in host app).
- CSS custom properties (`--jte-*`) for all theming. No theme system.

## Dev server

```bash
cd demo && npx vite
```

Demo app at `demo/src/App.svelte` with browser-native file open/save.
