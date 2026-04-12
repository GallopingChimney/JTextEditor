---
name: ai
description: Expert on JTextEditor's AI integration layer — the ai prop contract, context assembly, streaming transforms/generation, mode-aware actions, BubbleToolbar AI section, Ctrl+K inline prompt, and status indicator. Use when designing, implementing, debugging, or extending AI-powered editing features.
user-invocable: true
argument-hint: question or task about AI integration, e.g. add a new action, wire up a real provider, debug streaming
---

You are an expert on JTextEditor's AI integration layer. Help the user design, implement, and debug AI-powered editing features.

## User Request

$ARGUMENTS

## Architecture Overview

JTextEditor is a standalone Svelte 5 editor component (dual-output: npm component library for sidecar embedding, or standalone Tauri app). It does NOT call AI APIs directly. The host app provides an `ai` prop with async generator functions. JTextEditor handles all UI — the host just provides the brain.

### The ai Prop Contract

```javascript
// Passed to <JTextEditor ai={...}>
ai = {
  // Transform selected text. Returns async iterable of string chunks.
  transform(ctx, instruction) → AsyncIterable<string>,

  // Generate content at cursor. Returns async iterable of string chunks.
  generate(ctx, prompt) → AsyncIterable<string>,
}
```

Both functions receive a **context object** built by `ai-context.js`:
```javascript
{
  content,          // full document text
  selection,        // selected text (empty string if none)
  cursorOffset,     // integer position in document
  before,           // ~2000 chars before cursor
  after,            // ~500 chars after cursor
  mode,             // 'plain' | 'rich'
  language,         // e.g. 'javascript' (code mode only, null in rich)
  format,           // 'html' (rich) | 'text' (plain)
}
```

### File Map

```
src/
  JTextEditor.svelte              — Accepts `ai` prop, passes to children, Ctrl+K keybind, status indicator
  CodeMirrorEditor.svelte          — AI state + streaming for CM6 (view.dispatch inserts)
  RichTextEditor.svelte            — AI state + buffered paragraph-aware streaming for TipTap (insertAiText + splitBlock)
  BubbleToolbar.svelte             — Sparkle button + action dropdown (aiActions, aiGenerating, onaiaction, onaistop props)
  AiPrompt.svelte                  — Ctrl+K floating input (fixed position at cursor coords)
  lib/
    ai-context.js                  — buildContext() — assembles context from editor state
    ai-actions.js                  — Mode-aware action presets (codeActions, richActions, getActions)
```

### Data Flow

```
Host app (JExplore, demo, etc.)
  │ ai = { transform, generate }
  ▼
JTextEditor.svelte
  │ ai prop → passes to active editor child
  │ Ctrl+K → editorRef.openAiPrompt()
  │ Status indicator: sparkle in bottom-right (dim=ready, pulse=generating)
  ▼
┌─────────────────────────┬────────────────────────────┐
│ CodeMirrorEditor        │ RichTextEditor             │
│ ├ getEditorContext()     │ ├ getEditorContext()       │
│ ├ handleAiAction(action) │ ├ handleAiAction(action)   │
│ ├ handleAiGenerate(prompt)│ ├ handleAiGenerate(prompt) │
│ ├ runAiStream()          │ ├ runAiStream()            │
│ ├ stopAi()               │ ├ stopAi()                │
│ ├ openAiPrompt()         │ ├ openAiPrompt()          │
│ └ AiPrompt (template)   │ └ AiPrompt (template)     │
└─────────────────────────┴────────────────────────────┘
  ▲                           ▲
  │ aiActions, aiGenerating   │ aiActions, aiGenerating
  ▼                           ▼
BubbleToolbar.svelte (rich text only)
  Sparkle button → action dropdown → onaiaction callback
  Stop button (pulsing) during generation → onaistop callback
```

### Mode-Aware Actions

`ai-actions.js` defines two sets:

**Code mode** (`getActions("plain")`):
| id       | label     | icon         | instruction                                    |
|----------|-----------|--------------|------------------------------------------------|
| explain  | Explain   | help         | Explain what this code does                    |
| refactor | Refactor  | construction | Refactor to be cleaner and more idiomatic      |
| fix      | Fix       | build        | Fix any bugs in this code                      |
| addTypes | Add types | data_object  | Add type annotations to this code              |
| custom   | Custom... | edit         | (opens AiPrompt)                               |

**Rich text mode** (`getActions("rich")`):
| id       | label    | icon          | instruction                                     |
|----------|----------|---------------|--------------------------------------------------|
| rewrite  | Rewrite  | edit_note     | Rewrite to improve clarity and flow              |
| simplify | Simplify | compress      | Simplify, making more concise                    |
| expand   | Expand   | open_in_full  | Expand with more detail and depth                |
| shorten  | Shorten  | short_text    | Make shorter while preserving key points         |
| custom   | Custom...| edit          | (opens AiPrompt)                                 |

### Streaming Pattern

Both editors stream chunks from the async iterable, but insertion differs by mode:

- **CM6**: Inserts via `view.dispatch({ changes: { from, to, insert: chunk } })`, tracking `insertPos`. Plain text — no paragraph normalization needed.
- **TipTap**: Buffered paragraph-aware streaming. Trailing `\n` characters are held back (they might be the start of a `\n\n` split across chunks). When `\n{2,}` is detected, `insertAiText()` calls `editor.commands.splitBlock()` to create real `<p>` nodes instead of `<br>` within one paragraph. If the content looks like HTML with block elements (`<p>`, `<h1>`, etc.), it's passed directly to `insertContent()` and TipTap parses it natively.
- **Stop**: `aiAbort.abort()` breaks the for-await loop
- **Undo**: Standard Ctrl+Z works after streaming completes (streamed text is in undo history)

```javascript
// RichTextEditor.svelte — paragraph-aware streaming
function insertAiText(text) {
  if (!text) return;
  // HTML with block elements — let TipTap parse natively
  if (/<(?:p|h[1-6]|div|ul|ol|li|blockquote|pre)[>\s/]/i.test(text)) {
    editor.commands.insertContent(text);
    return;
  }
  const segments = text.split(/\n{2,}/);
  for (let i = 0; i < segments.length; i++) {
    if (segments[i]) editor.commands.insertContent(segments[i]);
    if (i < segments.length - 1) editor.commands.splitBlock();
  }
}

async function runAiStream(iterable, replaceSelection) {
  // ... abort + generating state setup ...
  let buf = "";
  for await (const chunk of iterable) {
    buf += chunk;
    const m = buf.match(/\n+$/);       // Hold trailing newlines
    const trailing = m ? m[0] : "";
    const ready = buf.slice(0, buf.length - trailing.length);
    buf = trailing;
    if (ready) insertAiText(ready);
  }
  if (buf) insertAiText(buf);           // Flush remaining
}
```

**Why buffering matters:** AI providers stream arbitrary chunks (`"end of para\n"` then `"\nstart of next"`). Without the buffer, that `\n\n` split across chunks would produce a `<br>` instead of a paragraph break. The buffer holds trailing newlines until the next chunk resolves the ambiguity.

### UI Components

**BubbleToolbar AI section** (rich text only, before pin toggle):
- When `aiActions.length > 0` and not generating: sparkle icon button → dropdown of actions
- When generating: pulsing red stop button
- Props: `aiActions`, `aiGenerating`, `onaiaction`, `onaistop`

**AiPrompt** (both modes, Ctrl+K):
- Fixed-position floating input at cursor coordinates
- Sparkle icon + text input + send arrow button
- Enter submits, Escape cancels, blur cancels
- Props: `visible`, `coords`, `onsubmit`, `oncancel`

**Status indicator** (JTextEditor bottom-right):
- `auto_awesome` icon in status bar
- Dim (`--jte-status-fg`) when ready
- Pulsing (`--jte-accent`, `jte-ai-pulse` animation) when generating
- Only rendered when `ai` prop is truthy

### CSS Classes

- `.jte-ai-prompt` — fixed-position floating container
- `.jte-ai-prompt-icon` — sparkle icon (accent color)
- `.jte-ai-prompt-input` — text input
- `.jte-ai-prompt-btn` — send button
- `.jte-bb-ai` — toolbar sparkle button (accent-colored icon)
- `.jte-bb-dd-ai` — dropdown action item (accent-colored icon)
- `.jte-bb-ai-stop` — pulsing stop button during generation
- `.jte-ai-status` — status bar indicator
- `.jte-ai-active` — pulsing state for status indicator
- `@keyframes jte-ai-pulse` — shared pulse animation (defined in both BubbleToolbar and JTextEditor)

## Guidelines

1. **JTextEditor never imports AI SDKs.** All AI calls go through the `ai` prop callbacks. The host (JExplore, demo app, or any embedder) provides the actual API calls.

2. **Both `transform` and `generate` must return `AsyncIterable<string>`.** Async generators (`async function*`) are the natural choice. Each yielded chunk is inserted immediately for streaming UX.

3. **Context is built per-request.** `buildContext()` assembles a fresh snapshot each time. The `before`/`after` fields give ~2000/500 chars of surrounding text for the AI to use as context.

4. **Actions are mode-aware.** Use `getActions(mode)` to get the right set. The "Custom..." action (id: `"custom"`) has no instruction — it opens AiPrompt instead.

5. **Stop is via AbortController.** `aiAbort.abort()` breaks the streaming loop. Both editors clean up in a `finally` block.

6. **The status indicator reads `editorRef.aiGenerating`.** This is a reactive `$state` on the child editor components. JTextEditor reads it directly for the status bar pulse.

7. **All styling uses `--jte-*` CSS vars** for theme compatibility. The pulse animation, accent colors, and status colors all inherit from the existing theme system.

8. **Test with the mock provider.** The demo app (`demo/src/App.svelte`) has a `mockAi` object that streams word-by-word with 60ms delays. Use `cd demo && npx vite` to test.

## Common Tasks

### Adding a new AI action
1. Add entry to `codeActions` or `richActions` in `src/lib/ai-actions.js`
2. Each entry needs: `{ id, label, icon, instruction }` (icon is a Material Symbols name)
3. That's it — BubbleToolbar renders from the array automatically

### Wiring a real AI provider (host side)
```javascript
const ai = {
  async *transform(ctx, instruction) {
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      messages: [{ role: 'user', content: `${instruction}:\n\n${ctx.selection}` }],
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        yield event.delta.text;
      }
    }
  },
  async *generate(ctx, prompt) {
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      messages: [{ role: 'user', content: `Context:\n${ctx.before}\n\nInstruction: ${prompt}` }],
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        yield event.delta.text;
      }
    }
  },
};
```

### Adding ghost text (future Phase 2)
Ghost text would be a new extension in each editor:
- CM6: `ViewPlugin` rendering `Decoration.widget` at cursor with `.jte-ai-ghost` class (40% opacity)
- TipTap: ProseMirror decoration plugin, inline decoration
- Shared state machine in `src/lib/ai-ghost.js` (debounce, cancel, accept)
- New `ai.complete(ctx)` method on the ai prop contract
- Tab to accept, Escape/keystroke to dismiss

### Debugging streaming
```javascript
// In demo App.svelte, replace mockAi with a logging wrapper:
const debugAi = {
  async *transform(ctx, instruction) {
    console.log('AI transform:', { instruction, selection: ctx.selection });
    for await (const chunk of mockAi.transform(ctx, instruction)) {
      console.log('chunk:', JSON.stringify(chunk));
      yield chunk;
    }
  },
  async *generate(ctx, prompt) {
    console.log('AI generate:', { prompt, cursor: ctx.cursorOffset });
    for await (const chunk of mockAi.generate(ctx, prompt)) {
      console.log('chunk:', JSON.stringify(chunk));
      yield chunk;
    }
  },
};
```

### Exposing editor to MCP (JExplore agent layer)
The MCP server in JExplore should expose tools that map to editor methods:
- `readDocument` → get active tab content
- `getSelection` → get selected text
- `editRange(from, to, text)` → replace range
- `insertAtCursor(text)` → insert at cursor
- `getDocumentInfo` → mode, language, cursor position, dirty state
These are separate from the real-time AI features — MCP is for agents, the ai prop is for the human.
