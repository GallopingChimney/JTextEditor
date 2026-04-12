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
  JTextEditor.svelte        — Shell: tabs, keyboard shortcuts, layout, mode switching, theme
  CodeMirrorEditor.svelte    — Thin Svelte 5 wrapper around CodeMirror 6
  RichTextEditor.svelte      — Thin Svelte 5 wrapper around TipTap + all RTF extensions
  BubbleToolbar.svelte       — Unified format toolbar (bubble on selection, pinned bar centered by default). Reactive state via `$derived` + `tick` prop from `onTransaction`. Heading icon (format_paragraph/format_h1-3), font icon (font_download), font size input, B/I/U/S/link, color (with indicator bar), highlight, alignment, lists, code, quote, code block, divider, table/image insert. Table editing tools when cursor in table. Responsive overflow at <620px.
  SlashMenu.svelte           — Block-type picker popup triggered by "/" key. Auto-scrolls to selected item on arrow key nav.
  TopBar.svelte              — Top bar: hamburger menu, breadcrumb (dir dimmed, filename bright, red * when dirty), mode toggle, view dropdown (page width button group, word wrap, color pickers)
  TabBar.svelte              — Bottom tab pills (transparent bg, active = 2px blue bottom border + background, red * dirty indicator). Theme toggle button in bottom-right status bar.
  lib/
    languages.js             — Single source of truth for language list
    characters.js            — Line ending detection
    cm-theme.js              — Theme (--jte-* CSS vars) + syntax highlight colors (both use var() for reactivity)
    cm-setup.js              — Curated CM6 extensions bundle
    cm-languages.js          — Lazy language loader with dynamic import()
    cm-invisibles.js         — CM ViewPlugin for invisible character display
    cm-search-panel.js       — Custom CM search panel matching JTE FindBar design
    tiptap-cm-codeblock.js   — TipTap extension: CM6-powered code blocks in RTF mode
    tiptap-slash-menu.js     — TipTap extension: ProseMirror plugin for "/" command detection
    tiptap-search.js         — TipTap extension: find/replace with same FindBar UI as CM
```

## Data flow

- Tab state owned by `JTextEditor`, passed as props to children
- Mode per tab: `'plain'` (CodeMirror) or `'rich'` (TipTap), toggled via TopBar
- Content sync: editors emit `onchange`, parent mutates tab. `$effect` with `untrack` + `lastEmitted` guard prevents recreation loops.
- Cursor position: `CodeMirrorEditor` → `oncursor` callback → `JTextEditor` → status bar
- Find/replace: CM's native search with custom panel (`cm-search-panel.js`); TipTap has matching `tiptap-search.js` plugin. Same `.jte-find` CSS classes, same UI. TopBar search button works in both modes.
- CM reconfiguration: Compartments for language, line numbers, word wrap, active line, invisibles
- Settings override: `settings` prop (all fields optional) overrides internal `$state` via `$derived(settings.x ?? _x)`. Host omits a key → internal state applies. `onsettingschange` callback fires on internal toggles with effective state snapshot. Settings include: showInvisibles, showLineNumbers, wordWrap, highlightLine, theme, pageWidth, bgColor, pageCanvasColor, pageColor.
- Dirty state: `tab.modified` set true on content change. Red `*` shown in breadcrumb (TopBar) and tab pill (TabBar). `markSaved()` resets it.

## Key decisions

- CodeMirror 6 replaces textarea+Prism. Virtualized, incremental parsing, proper undo/redo.
- TipTap (ProseMirror-based) for rich text. CM6 code blocks inside RTF via custom NodeView.
- RTF UI: BubbleToolbar shows on text selection (bubble mode, Floating UI with `strategy: "fixed"`, offset, flip, shift, hide for edge-safe positioning) or always visible (pinned bar mode centered, default). All toolbar state reactive via `$derived` + `tick` from `onTransaction`. Heading/font dropdowns use Material Symbols icons; text color has indicator bar. SlashMenu on "/" for block types. Responsive overflow collapses block tools into "..." dropdown when toolbar is narrow.
- RTF extensions: bold, italic, underline, strike, code, highlight, link, color, font-size, font-family, text-align (incl. justify), image (with resize), table (with column resize), typography, placeholder.
- BubbleToolbar table editing section only renders when `state.table` is true. Uses `state.canMerge`/`state.canSplit` for conditional merge/split items.
- Native selection used (no `drawSelection()`). `::selection` CSS handles colors. Empty-line selection in TipTap via `EmptyLineSelection` decoration plugin.
- Shared CM infrastructure: `cm-theme.js` and `cm-languages.js` used by both standalone editor and TipTap code blocks.
- `untrack()` in mount `$effect` blocks — critical pattern. Without it, prop changes trigger full editor recreation.
- Google Material Symbols for all icons (loaded via CDN in host app).
- CSS custom properties (`--jte-*`) for all theming. CM theme uses `var()` references for runtime reactivity.
- Dark/light theme: `data-theme` attribute on `.jte-root`. Light overrides set in `JTextEditor.svelte`. All colors (chrome, syntax, selection, scrollbar) use CSS vars — theme switch is pure CSS, no editor recreation. Theme toggle in bottom-right status bar.
- Page view: RTF-only mode. Page width selector (narrow 560px / normal 816px / wide 1280px / full) as icon-only button group in View dropdown. Page uses fixed `width` (not max-width) so it scrolls horizontally when window is smaller. Word wrap toggle only visible in full mode. Page color and canvas background user-configurable via color pickers in View dropdown.
- Color settings: `--jte-bg` (editor bg), `--jte-page-canvas` (canvas behind page), `--jte-page-color` (page document color). Page color defaults to toolbar color (`--jte-menubar-bg`). In full RTF mode, page color sets `--jte-bg`. Color pickers use `liveAction()` for real-time preview without closing dropdown.
- BubbleMenu shows on text selection when editor focused, hides when search open, pinned, in code blocks, or selection empty. `updateDelay: 0` for instant appearance.
- Pin toggle: `pinned` state in RichTextEditor (default: true = bar mode). When pinned, BubbleToolbar renders as fixed bar above editor content. When unpinned, reverts to tippy-positioned bubble on selection.
- Default mode: rich text, normal page width, pinned toolbar.

## Dev server

```bash
cd demo && npx vite
```

Demo app at `demo/src/App.svelte` with browser-native file open/save.
