# JTextEditor Integration Guide

## Install

```bash
npm install jtexteditor
```

Peer dependency: `svelte ^5.0.0`. Host must load [Google Material Symbols](https://fonts.google.com/icons) (Outlined, 100-700 weight).

## Two ways to use JTextEditor

### 1. Sidecar mode (embedded component)

Import and render `<JTextEditor>` directly inside your Svelte app. This is the default mode. You own the window, routing, and lifecycle — JTextEditor is just the editor panel.

```svelte
<script>
  import { JTextEditor } from 'jtexteditor';

  let editor;

  // Minimal required callbacks
  function handleSave(tab) {
    // tab = { id, name, content, language, path, mode, modified }
    writeFile(tab.path || promptSavePath(), tab.content);
    editor.markSaved(tab.path);
  }
</script>

<JTextEditor
  bind:this={editor}
  mode="sidecar"
  tabs={[{ id: '1', name: 'readme.md', content: '# Hello', language: 'markdown', path: '/docs/readme.md' }]}
  onsave={handleSave}
  onsaveAs={(tab) => { /* prompt for path, then save */ }}
  onopen={() => { /* file picker, then editor.openFile({ name, content, language, path }) */ }}
  onclose={() => { /* navigate away or close panel */ }}
  onback={() => { /* navigate to previous view */ }}
/>
```

### 2. App mode (standalone Tauri exe)

Build JTextEditor as a standalone executable. The host app launches the exe as a child process — no component import needed.

```bash
# Build the exe (output in src-tauri/target/release/)
cd path/to/jtexteditor
npm run build:app
```

Launch from your host app:

```js
// Tauri host example
import { Command } from '@tauri-apps/plugin-shell';
const cmd = Command.create('jtexteditor', ['--file', filePath]);
await cmd.spawn();

// Node.js host example
import { spawn } from 'child_process';
spawn('path/to/jtexteditor.exe', ['--file', filePath], { detached: true, stdio: 'ignore' }).unref();
```

The exe opens the file in its own window with full titlebar controls (minimize, maximize, close). No IPC needed — it is a fully independent process.

### Hybrid: sidecar with launch-to-exe

Use sidecar mode for inline editing, and provide `onlaunch` to let users pop a tab out into its own window. The launch button (arrow icon) appears next to the filename on hover.

```svelte
<JTextEditor
  bind:this={editor}
  mode="sidecar"
  onsave={handleSave}
  onlaunch={(tab) => {
    // Save to disk first if needed, then spawn exe
    spawn('path/to/jtexteditor.exe', ['--file', tab.path], { detached: true });
  }}
/>
```

## Props

### `<JTextEditor>` (main component)

| Prop | Type | Default | Description |
|---|---|---|---|
| `tabs` | `Array` | `[]` | Initial tabs. Each: `{ id, name, content, language?, path?, mode? }` |
| `settings` | `Object` | `{}` | Override any editor setting (all optional, see below) |
| `ai` | `Object\|null` | `null` | AI provider: `{ transform(ctx, instruction), generate(ctx, prompt) }` — both return `AsyncIterable<string>` |
| `mode` | `'sidecar'\|'app'` | `'sidecar'` | UI chrome mode |
| `onopen` | `Function` | — | Called when user requests file open |
| `onsave` | `Function` | — | `(tab) => void` — called on Ctrl+S |
| `onsaveAs` | `Function` | — | `(tab) => void` — called on Ctrl+Shift+S |
| `ontabchange` | `Function` | — | `(tab) => void` — called when active tab changes |
| `onsettingschange` | `Function` | — | `(settings) => void` — called on any setting toggle |
| `onsettings` | `Function` | — | Called when user clicks Settings menu item or Ctrl+, (host should render `<Settings>`) |
| `onback` | `Function` | — | Sidecar: back navigation |
| `onclose` | `Function` | — | Close button clicked |
| `onminimize` | `Function` | — | App mode: minimize window |
| `onmaximize` | `Function` | — | App mode: maximize window |
| `onrename` | `Function` | — | `(tab, newName) => void` — file renamed via breadcrumb |
| `onlaunch` | `Function` | — | `(tab) => void` — launch tab in separate exe. When provided, shows a launch button next to the breadcrumb. |
| `onmodified` | `Function` | — | `(tab, modified: boolean) => void` — fires when a tab's dirty state changes (true on first edit, false after `markSaved`) |
| `ontabclose` | `Function` | — | `(tab) => void` — fires when a tab is closed via the × button (before removal) |

### Bindable methods

| Method | Description |
|---|---|
| `openFile({ name, content, language?, path? })` | Open content in a new tab |
| `markSaved(path?)` | Clear dirty flag on active tab, optionally update path |
| `getActiveTab()` | Returns a snapshot `{ id, name, content, path, modified, ... }` of the active tab, or `null` |
| `removeTab(id)` | Programmatically close a tab by ID |

### Settings object

All fields optional. Omitted keys use internal defaults.

```js
import { editorDefaults } from 'jtexteditor';
// editorDefaults = {
//   showInvisibles: false, showLineNumbers: true, wordWrap: false,
//   highlightLine: true, theme: 'dark', pageWidth: 'normal',
//   bgColor: '', pageColor: '', fontFamily: '...', fontSize: '14px',
//   tabSize: 4, lineHeight: '1.5', defaultMode: 'rich', toolbarMode: 'pinned'
// }
```

### `<Settings>` (standalone settings panel)

Render this yourself when `onsettings` fires. Supports two layouts: `widget` (sidebar) or `page` (full-width).

```svelte
<Settings
  {settings}
  aiSettings={{ provider: 'anthropic', apiKey: '...', model: 'claude-sonnet-4-20250514' }}
  layout="widget"
  onsettingschange={(s) => settings = s}
  onaisettingschange={(ai) => aiConfig = ai}
  onclose={() => showSettings = false}
/>
```

Pass `aiSettings` to show the AI configuration section. Omit it to hide AI settings entirely.

### AI provider contract

```js
const ai = {
  // Transform selected text. Return chunks as async iterable.
  async *transform(ctx, instruction) {
    // ctx = { content, selection, cursorOffset, before, after, mode, language, format }
    const stream = await callApi({ prompt: instruction, text: ctx.selection });
    for await (const chunk of stream) yield chunk;
  },
  // Generate new text at cursor. Same signature.
  async *generate(ctx, prompt) {
    const stream = await callApi({ prompt, context: ctx.before });
    for await (const chunk of stream) yield chunk;
  }
};
```

## Tab object shape

```js
{
  id: 'tab-1',          // Auto-generated if omitted
  name: 'file.txt',     // Display name
  content: '',           // File content (string)
  language: 'js',        // File extension for syntax highlighting (plain mode)
  path: '/full/path',    // Filesystem path (used by save/launch)
  mode: 'rich',          // 'rich' or 'plain'
  modified: false        // Dirty flag (managed internally, reset via markSaved)
}
```

## CSS theming

All colors use `--jte-*` CSS custom properties. Set `data-theme="light"` or `"dark"` via the `settings.theme` prop. Override any variable on a parent element:

```css
.my-editor-container {
  --jte-bg: #1a1a2e;
  --jte-accent: #e94560;
}
```

## Exports summary

```js
// Components
import { JTextEditor, CodeMirrorEditor, RichTextEditor, Settings } from 'jtexteditor';

// Utilities
import { languages } from 'jtexteditor';                          // Language list for dropdowns
import { buildContext } from 'jtexteditor';                        // Build AI context from editor state
import { getActions, codeActions, richActions } from 'jtexteditor'; // AI action presets
import { editorDefaults, aiDefaults, providerPresets } from 'jtexteditor'; // Config defaults
import { fontFamilies, fontSizes, lineHeights } from 'jtexteditor';       // Option lists for custom UIs
```
