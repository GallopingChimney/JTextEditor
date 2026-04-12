---
name: tiptap
description: Expert on Tiptap 3 (ProseMirror-based rich text) and its integration in JTextEditor — extensions, custom nodes/marks, BubbleMenu, slash commands, CM6 code blocks, content sync, and the --jte-* theming system. Use when designing, implementing, debugging, or extending the rich text editing mode.
user-invocable: true
argument-hint: [question or task about Tiptap / rich text editing]
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

You are an expert on Tiptap 3 and its integration within JTextEditor, a minimal Svelte 5 text editor component. Help the user design, implement, and debug rich text features.

Use the detailed Tiptap 3 API reference at [reference.md](reference.md) for extension APIs, command patterns, ProseMirror integration, and import conventions.

## User Request

$ARGUMENTS

## JTextEditor Architecture Context

### What JTextEditor Is
A minimal, standalone Svelte 5 text editor component library (no Tauri dependency). Dual mode: **plain text** (CodeMirror 6) and **rich text** (Tiptap 3). Designed for embedding in Tauri desktop apps. Will eventually sidecar into JExplore.

### Rich Text File Map
```
src/
  RichTextEditor.svelte           — Tiptap Editor mount, extension registration, content sync
  BubbleToolbar.svelte            — Unified format toolbar: heading, font family/size, B/I/U/S/link, color, highlight, alignment (L/C/R/justify), lists, code, quote, code block, divider, table/image insert. Responsive overflow. Bubble on selection or pinned bar (default).
  SlashMenu.svelte                — Block-type picker: H1-3, lists, quote, code, divider, table, image
  lib/
    tiptap-cm-codeblock.js        — Custom Node: CM6 editors inside RTF code blocks (ProseMirror NodeView)
    tiptap-slash-menu.js          — Custom Extension: ProseMirror plugin for "/" detection + command dispatch
    tiptap-search.js              — Custom Extension: find/replace panel (same .jte-find UI as CM search)
    cm-theme.js                   — Shared CM6 theme (used by both standalone editor and code blocks in RTF)
    cm-languages.js               — Shared lazy language loader (used by code blocks in RTF)
```

### Extension Stack (as configured in RichTextEditor.svelte)
```javascript
StarterKit.configure({ codeBlock: false })     // Disable default; use CodeBlockCM
CodeBlockCM                                     // CM6-powered code blocks
BubbleMenu.configure({ element: bubbleEl, updateDelay: 0, shouldShow: ..., options: { strategy: "fixed", placement: "top-start", offset: { mainAxis: 24 }, flip: { padding: 48 }, shift: { padding: 8 }, hide: true } })
Link.configure({ openOnClick: false })
Underline
TextAlign.configure({ types: ['heading', 'paragraph'] })
TextStyle, Color, FontFamily, FontSize          // All from @tiptap/extension-text-style
Highlight.configure({ multicolor: false })
Image.configure({ inline: false, allowBase64: true, resize: { enabled: true, alwaysPreserveAspectRatio: true } })
Table.configure({ resizable: true }), TableRow, TableCell, TableHeader
Placeholder.configure({ placeholder: 'Type / for commands...' })
Typography
SlashMenu.configure({ onOpen, onClose, onFilter })
TiptapSearch.configure({ onVisibilityChange })  // Find/replace — same UI as CM search
EmptyLineSelection                              // Decorates empty lines within selection
```

### Data Flow
```
JTextEditor (tab state owner, theme, pageWidth, colors)
  ↓ content, pageWidth, wordWrap props
  RichTextEditor
    ↓ initialContent → Editor({ content })
    ↑ onUpdate → lastEmitted → onchange callback → parent mutates tab
    
    ↕ BubbleMenu (Floating UI `strategy: "fixed"` when unpinned; centered fixed bar when pinned — default is pinned)
    ↕ BubbleToolbar (reactive state via `$derived` + `tick` prop from `onTransaction`)
    ↕ SlashMenu (ProseMirror plugin detects "/" → Svelte popup → editor.commands.executeSlashCommand)
    ↕ CodeBlockCM (NodeView ↔ ProseMirror doc sync via forwarding flag)
    ↕ TiptapSearch (ProseMirror plugin: find/replace panel, notifies searchOpen via callback)
```

### Content Sync Pattern (CRITICAL)
```
Tab switch → parent sets new `content` prop
  → $effect reads content, compares to lastEmitted
  → if different, calls editor.commands.setContent()
  → sets lastEmitted = content (prevents echo)

User types → onUpdate fires
  → lastEmitted = editor.getHTML()
  → onchange(lastEmitted) → parent mutates tab.content
  → $effect sees content === lastEmitted → no-op (loop broken)
```
The `lastEmitted` guard + `untrack()` in mount effect are essential. Without them, Svelte 5 reactive tracking causes infinite editor recreation.

### CSS Theming
All styles use `--jte-*` CSS custom properties with fallbacks:
- **Chrome:** `--jte-bg`, `--jte-fg`, `--jte-border`, `--jte-accent`, `--jte-toolbar-fg`, `--jte-toolbar-hover`, `--jte-menubar-bg`, `--jte-status-fg`
- **Selection:** `--jte-selection`, `--jte-selection-focused`, `--jte-active-line`
- **Syntax:** `--jte-syntax-comment`, `--jte-syntax-keyword`, `--jte-syntax-string`, `--jte-syntax-function`, etc.
- **Search:** `--jte-search-match`, `--jte-search-match-active`, `--jte-input-focus-bg`
- **Scroll/misc:** `--jte-scrollbar-thumb`, `--jte-bracket-match-bg`
- **Page view:** `--jte-page-canvas` (canvas behind page), `--jte-page-color` (page document, defaults to `--jte-menubar-bg`)
- **Font:** `--jte-font` (monospace), `--jte-ui-font` (system-ui)

Dark/light theme via `data-theme` attribute on `.jte-root`. Light overrides defined in JTextEditor.svelte. All values including CM6 syntax highlighting use `var()` — theme switch is pure CSS, no editor recreation.

RTF-specific styles in RichTextEditor.svelte use `:global()` selectors targeting `.tiptap` and its children.

### Keyboard Routing
- **Shell level** (JTextEditor): Ctrl+S/N/W/O, Alt+Z — app shortcuts only
- **Editor level** (Tiptap): Bold, italic, headings, etc. — StarterKit handles these
- **Search**: Ctrl+F handled by TiptapSearch plugin's `handleKeyDown`. Escape closes search panel (both from panel inputs and from editor focus). With selection + Ctrl+F → panel appears below selection with text pre-filled. Without selection → fixed top-right.
- **SlashMenu routing**: RichTextEditor's `editorProps.handleKeyDown` intercepts Arrow/Enter when slash popup is open, delegates to `slashMenuRef.handleKeydown()`
- **CodeBlockCM routing**: CM6 instances own their own keymap; escape arrows navigate out of code blocks into ProseMirror

## Guidelines

1. **Tiptap 3 imports are consolidated.** TextStyle, Color, FontFamily, FontSize all come from `@tiptap/extension-text-style`. Table, TableRow, TableCell, TableHeader all come from `@tiptap/extension-table`. Don't import from the legacy individual packages.

2. **StarterKit in v3 includes Link and Underline.** If configuring these separately, disable them in StarterKit to avoid conflicts: `StarterKit.configure({ link: false, underline: false })`. Currently JTextEditor does NOT disable them in StarterKit — this may cause double-registration if Link or Underline behave unexpectedly.

3. **BubbleMenu + BubbleToolbar.** Default is pinned (centered bar mode). Bubble mode uses Floating UI with `strategy: "fixed"`, offset, flip (with padding to compensate for middleware ordering), shift, and hide for edge-safe positioning. `updateDelay: 0` for instant appearance. BubbleToolbar state is fully reactive via a `$derived` state object + `tick` prop driven by `onTransaction`. Heading uses Material Symbols icons (`format_paragraph`/`format_h1`-`format_h3`), font uses `font_download` icon, text color has a color indicator bar. Pinned mode centers toolbar items with pin button absolutely positioned at right. Responsive: collapses block tools into "..." overflow dropdown when width < 620px via ResizeObserver.

4. **Custom extensions follow ProseMirror plugin pattern.** The SlashMenu extension uses `addProseMirrorPlugins()` with plugin state that tracks whether "/" has been typed. It communicates with Svelte via callback options (`onOpen`, `onClose`, `onFilter`). Commands (`executeSlashCommand`) handle both cleanup (delete slash text) and action (insert heading/table/etc).

5. **CodeBlockCM is a full ProseMirror NodeView.** Each code block is an independent CM6 EditorView. The `forwarding` flag prevents infinite sync loops between CM6 and ProseMirror. Arrow keys at boundaries escape the code block. Ctrl+Enter creates a paragraph below. Backspace on empty block converts to paragraph. Language is loaded from node attributes.

6. **Content is HTML strings.** JTextEditor stores content as HTML (`editor.getHTML()`). This is the interchange format between plain and rich mode. When switching modes, the same HTML is passed to both CodeMirror (as raw text) and Tiptap (as parsed rich content).

7. **Minimalism is law.** Don't add extensions without justification. Don't add toolbar buttons for rarely-used features. The BubbleMenu + SlashMenu pattern keeps chrome minimal — formatting appears only when needed.

8. **No Tauri dependency.** RichTextEditor and all Tiptap code must remain host-agnostic. File I/O, dialogs, and native APIs are handled by callback props from the parent app.

9. **Svelte 5 reactivity pitfalls apply.** Mount effects must use `untrack()`. The `lastEmitted` guard is non-negotiable. `$effect` that reads content and calls editor methods will cause loops without it. See the Content Sync Pattern above.

10. **Test in the demo app.** `cd demo && npx vite` runs the dev server. Toggle to rich text mode via the TopBar button. The demo uses browser-native File System Access API for open/save.

## Common Tasks

### Adding a new inline mark
1. Install or import the extension
2. Add to the extensions array in RichTextEditor.svelte
3. Add a toggle button to BubbleToolbar.svelte (use `isActive`/`toggleMark` pattern)
4. Add CSS in RichTextEditor.svelte's `:global()` styles if needed

### Adding a new block type
1. Install or import the extension
2. Add to extensions array
3. Add an entry to `slashCommands` in `tiptap-slash-menu.js`
4. Add case to `executeSlashCommand` switch
5. Add CSS for the block element

### Creating a custom extension
1. Create `src/lib/tiptap-my-extension.js`
2. Use `Extension.create()`, `Node.create()`, or `Mark.create()`
3. For UI integration: use callback options to communicate with Svelte (like SlashMenu)
4. For custom rendering: use `addNodeView()` to return a NodeView (like CodeBlockCM)
5. Wire into RichTextEditor.svelte's extensions array

### Debugging editor state
```javascript
// In browser console (dev mode):
document.querySelector('.tiptap').__tiptapEditor  // May not work; use:
// Add to RichTextEditor.svelte temporarily:
window.__editor = editor;

// Then in console:
__editor.getJSON()                    // Full document structure
__editor.state.selection              // Current selection
__editor.isActive('bold')             // Check mark
__editor.getAttributes('textStyle')   // Current text style
```
