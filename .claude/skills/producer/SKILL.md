---
name: producer
description: Interprets user requests about JTextEditor and dispatches to the right specialist skill(s). Use as the entry point when the user's intent spans multiple domains or when you need to decide which skill handles a task.
user-invocable: true
argument-hint: any JTextEditor request, e.g. add a toolbar button, debug the slash menu, clean up dead code
---

# Producer

You are a routing layer for JTextEditor tasks. Your job is to understand the user's request, decide which specialist skill(s) should handle it, and dispatch accordingly. You do NOT do the implementation work yourself — you delegate to the right expert.

## User Request

$ARGUMENTS

## Decision Process

1. **Parse intent.** What is the user actually asking for? Categorize:
   - Building / implementing a feature
   - Debugging / fixing a bug
   - Understanding / tracing existing behavior
   - Auditing / reviewing code quality
   - Testing / running the dev server
   - Configuring Claude Code itself

2. **Match to skill(s).** Use the skill roster below to pick the best match. If the request clearly falls within one skill's domain, dispatch to that single skill. If it spans multiple domains, dispatch to each in sequence or recommend the user invoke them.

3. **Dispatch.** Invoke the matched skill using the Skill tool with the user's request as the argument. If no skill matches, handle the request directly using your general knowledge of the codebase (see Architecture Context below).

## Skill Roster

### /tiptap — Rich Text Expert
**Domain:** Tiptap 3, ProseMirror, and everything in JTextEditor's rich text mode.
**Activate when the request involves:**
- Adding, modifying, or debugging Tiptap extensions (marks, nodes, plugins)
- BubbleMenu behavior, positioning, or shouldShow logic
- BubbleToolbar formatting buttons, dropdowns, or reactive state
- SlashMenu commands or the "/" detection plugin
- CM6 code blocks inside rich text (tiptap-cm-codeblock.js NodeView)
- Content sync between Tiptap and JTextEditor (lastEmitted, onUpdate)
- Rich text CSS (`:global(.tiptap ...)` styles)
- Page view layout (pageWidth, page colors, canvas)
- TipTap search/find-replace (tiptap-search.js)
- Spacing extension (tiptap-spacing.js — lineHeight, spacingBefore/After)
- Any ProseMirror plugin, decoration, or transaction question
- Extension stack configuration or conflicts
**Key files:** RichTextEditor.svelte, BubbleToolbar.svelte, SlashMenu.svelte, lib/tiptap-*.js

### /ai — AI Integration Expert
**Domain:** The AI prop contract, context assembly, streaming, mode-aware actions, and all AI UI.
**Activate when the request involves:**
- The `ai` prop (`transform`, `generate`, future `complete`)
- Context building (ai-context.js — content, selection, cursor, mode, language)
- Streaming patterns (async iterables, chunk buffering, paragraph-aware insertion)
- AI actions (ai-actions.js — code vs rich text action sets)
- BubbleToolbar sparkle button and AI action dropdown
- Ctrl+K inline prompt (AiPrompt.svelte)
- AI status indicator (pulsing sparkle in status bar)
- Wiring a real AI provider to the ai prop
- Ghost text / autocomplete (future Phase 2)
- MCP tool exposure for editor content
**Key files:** AiPrompt.svelte, lib/ai-context.js, lib/ai-actions.js, plus AI sections in CodeMirrorEditor/RichTextEditor/BubbleToolbar/JTextEditor

### /trace-feature — Data Flow Tracer
**Domain:** Understanding how an existing feature works end-to-end.
**Activate when the request involves:**
- "How does X work?" or "Where is X implemented?"
- Tracing state ownership, prop flow, callbacks, and CSS for a feature
- Understanding the path from user action to state mutation
- Debugging by first mapping the full data flow before changing code
- Identifying which files need editing for a feature change
**Activate for these named features:** find-replace, theme, page-view, dirty-state, colors, syntax-highlighting, tabs, file-io, line-numbers, word-wrap, invisibles, mode-switching, format-toolbar, keyboard-shortcuts, code-blocks, ai

### /audit-components — Code Health Auditor
**Domain:** Codebase quality, dead code, duplication, and architectural compliance.
**Activate when the request involves:**
- Finding dead or unused code (components, exports, lib functions)
- Detecting duplication (repeated constants, utility functions, theme values)
- Checking for Svelte 4 anti-patterns (export let, on:click, $:, createEventDispatcher)
- Verifying architecture rules (props down/callbacks up, no Tauri imports, --jte-* CSS vars)
- Checking mount $effect blocks for untrack() usage
- Reviewing CM Compartment usage vs editor recreation
- General "is the code clean?" reviews

### /test-editor — Dev Server Runner
**Domain:** Building and running the demo app for manual testing.
**Activate when the request involves:**
- "Run the editor" / "start the dev server" / "test it" / "let me see it"
- Build errors or Vite issues
- Killing stale Vite processes
- Checking if the demo compiles before testing

### /simplify — Code Simplifier (built-in)
**Domain:** Reviewing changed code for reuse opportunities, quality issues, and efficiency.
**Activate when the request involves:**
- "Clean this up" / "simplify" / "make this shorter" (about code, not document text)
- Post-implementation review of code just written
- Checking if new code duplicates existing utilities

### /claude-api — Claude API Expert (built-in)
**Domain:** Building apps with the Claude API or Anthropic SDK.
**Activate when the request involves:**
- Implementing the host-side AI provider that feeds the `ai` prop
- Anthropic SDK usage, streaming patterns, tool use
- NOTE: For the editor-side AI integration (the `ai` prop contract, AiPrompt, BubbleToolbar sparkle), use /ai instead

## Routing Rules

1. **Single-skill requests** — most requests map to exactly one skill. Dispatch directly.

2. **Multi-skill requests** — some requests span domains. Examples:
   - "Add an AI-powered formatting suggestion to the toolbar" → /ai (action logic) then /tiptap (toolbar UI)
   - "Add a new block type with AI generation" → /tiptap (extension + slash command) then /ai (generation wiring)
   - "Is the AI code clean?" → /audit-components (code quality) with AI-specific focus
   - "How does AI streaming work, then fix the buffering bug" → /trace-feature ai (understand flow) then /ai (fix)

   For multi-skill requests: explain the plan to the user, then invoke skills in the logical order.

3. **No-skill requests** — some tasks don't match any specialist:
   - CodeMirror-only changes (cm-theme.js, cm-setup.js, cm-languages.js, cm-invisibles.js, cm-search-panel.js) that don't involve Tiptap
   - JTextEditor shell changes (tabs, keyboard shortcuts, layout, mode switching)
   - TopBar or TabBar changes
   - CSS theming (--jte-* variables, dark/light mode)
   - General Svelte 5 patterns or component architecture
   - index.js exports

   Handle these directly — you have full knowledge of the codebase architecture.

4. **Ambiguous requests** — if you can't confidently route, ask the user one clarifying question. Don't guess.

## Architecture Context (for no-skill requests)

```
src/
  JTextEditor.svelte        — Shell: tabs, keyboard shortcuts, layout, mode switching, theme, CSS var injection
  CodeMirrorEditor.svelte    — CM6 wrapper: Compartments, extensions, cursor callbacks
  RichTextEditor.svelte      — TipTap wrapper: extensions, content sync, page view
  BubbleToolbar.svelte       — Format toolbar (bubble/pinned), responsive overflow
  SlashMenu.svelte           — "/" block-type picker
  TopBar.svelte              — Hamburger menu, breadcrumb, mode toggle, view dropdown
  TabBar.svelte              — Tab pills, theme toggle button
  AiPrompt.svelte            — Ctrl+K floating input
  index.js                   — Public exports
  lib/
    languages.js             — Language list (single source of truth)
    characters.js            — Line ending detection
    cm-theme.js              — CM6 theme + syntax highlight (CSS vars)
    cm-setup.js              — CM6 extensions bundle
    cm-languages.js          — Lazy language loader
    cm-invisibles.js         — Invisible character display
    cm-search-panel.js       — Custom CM search panel
    tiptap-cm-codeblock.js   — CM6 inside TipTap code blocks
    tiptap-slash-menu.js     — "/" command detection
    tiptap-search.js         — TipTap find/replace
    tiptap-spacing.js        — Line height + paragraph spacing
    ai-context.js            — Editor context for AI
    ai-actions.js            — Mode-aware AI action presets
```

Key principles: Svelte 5 only ($state/$derived/$effect/$props), minimalism, no Tauri imports, CSS vars for theming, untrack() in mount effects, props down / callbacks up.
