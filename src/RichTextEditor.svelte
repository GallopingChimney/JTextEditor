<script>
	import { untrack } from "svelte";
	import { Editor, Extension } from "@tiptap/core";
	import { Plugin } from "@tiptap/pm/state";
	import { Decoration, DecorationSet } from "@tiptap/pm/view";
	import StarterKit from "@tiptap/starter-kit";
	import { BubbleMenu } from "@tiptap/extension-bubble-menu";
	import Link from "@tiptap/extension-link";
	import Underline from "@tiptap/extension-underline";
	import TextAlign from "@tiptap/extension-text-align";
	import { TextStyle, Color, FontFamily, FontSize } from "@tiptap/extension-text-style";
	import Highlight from "@tiptap/extension-highlight";
	import Image from "@tiptap/extension-image";
	import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
	import Placeholder from "@tiptap/extension-placeholder";
	import Typography from "@tiptap/extension-typography";
	import { CodeBlockCM } from "./lib/tiptap-cm-codeblock.js";
	import { SlashMenu } from "./lib/tiptap-slash-menu.js";
	import { TiptapSearch } from "./lib/tiptap-search.js";
	import { Spacing } from "./lib/tiptap-spacing.js";
	import { mdToHtml } from "./lib/markdown-html.js";
	import { buildContext } from "./lib/ai-context.js";
	import { getActions } from "./lib/ai-actions.js";
	import BubbleToolbar from "./BubbleToolbar.svelte";
	import SlashMenuPopup from "./SlashMenu.svelte";
	import AiPrompt from "./AiPrompt.svelte";

	let { content = "", onchange, pageWidth = "full", wordWrap = true, ai = null } = $props();

	let editorEl = $state();
	let bubbleEl = $state();
	let editor = $state();
	let lastEmitted = "";

	let searchOpen = $state(false);
	let pinned = $state(true);
	let editorTick = $state(0);

	// Decorates empty textblocks within a selection so they show a thin highlight
	const EmptyLineSelection = Extension.create({
		name: "emptyLineSelection",
		addProseMirrorPlugins() {
			return [new Plugin({
				props: {
					decorations(state) {
						const { selection, doc } = state;
						if (selection.empty) return DecorationSet.empty;
						const decos = [];
						doc.nodesBetween(selection.from, selection.to, (node, pos) => {
							if (node.isTextblock && node.content.size === 0) {
								decos.push(Decoration.node(pos, pos + node.nodeSize, { class: "jte-empty-selected" }));
							}
						});
						return decos.length ? DecorationSet.create(doc, decos) : DecorationSet.empty;
					},
				},
			})];
		},
	});

	// Slash menu state
	let slashVisible = $state(false);
	let slashCoords = $state(null);
	let slashQuery = $state("");
	let slashMenuRef = $state();

	// AI state
	let aiGenerating = $state(false);
	let aiAbort = $state(null);
	let aiPromptVisible = $state(false);
	let aiPromptCoords = $state(null);
	let aiPromptHasSelection = $state(false);

	let aiActions = $derived(ai ? getActions("rich") : []);

	function getEditorContext() {
		if (!editor) return null;
		const { from, to } = editor.state.selection;
		const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n");
		const selection = from !== to ? editor.state.doc.textBetween(from, to, "\n") : "";
		return buildContext({ content: text, selection, cursorOffset: to, mode: "rich" });
	}

	async function handleAiAction(action) {
		if (!ai?.transform || !editor) return;
		if (action.id === "custom") {
			showAiPrompt();
			return;
		}
		const ctx = getEditorContext();
		if (!ctx?.selection) return;
		await runAiStream(ai.transform(ctx, action.instruction), true);
	}

	async function handleAiGenerate(prompt, opts) {
		aiPromptVisible = false;
		if (!ai?.generate || !editor) return;
		const ctx = getEditorContext();
		await runAiStream(ai.generate(ctx, prompt), opts?.replace ?? false);
	}

	/** Insert raw AI text during streaming — paragraph breaks on \n\n, no formatting. */
	function insertAiText(text) {
		if (!text) return;
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
		if (!iterable || !editor) return;
		const abort = new AbortController();
		aiAbort = abort;
		aiGenerating = true;
		let buf = "";
		let collected = "";

		try {
			if (replaceSelection) {
				editor.commands.deleteSelection();
			} else if (editor.state.selection.from !== editor.state.selection.to) {
				editor.commands.setTextSelection(editor.state.selection.to);
				editor.commands.splitBlock();
				editor.commands.splitBlock();
			}

			const startPos = editor.state.selection.from;

			for await (const chunk of iterable) {
				if (abort.signal.aborted) break;
				buf += chunk;
				collected += chunk;

				const m = buf.match(/\n+$/);
				const trailing = m ? m[0] : "";
				const ready = buf.slice(0, buf.length - trailing.length);
				buf = trailing;

				if (ready) insertAiText(ready);
			}

			if (buf) insertAiText(buf);

			// Post-process: swap raw text with markdown-converted HTML
			// Skip if the AI already returned HTML (transforms often do)
			if (collected && !abort.signal.aborted) {
				const isHtml = /<(?:p|h[1-6]|div|ul|ol|li|blockquote|pre)[>\s/]/i.test(collected);
				if (!isHtml) {
					const endPos = editor.state.selection.to;
					editor.chain()
						.setTextSelection({ from: startPos, to: endPos })
						.deleteSelection()
						.insertContent(mdToHtml(collected))
						.run();
				}
			}
		} finally {
			aiGenerating = false;
			aiAbort = null;
		}
	}

	function stopAi() {
		aiAbort?.abort();
	}

	function showAiPrompt() {
		if (!editor) return;
		const { view } = editor;
		const { from, to } = editor.state.selection;
		const coords = view.coordsAtPos(view.state.selection.head);
		if (coords) {
			aiPromptCoords = { x: coords.left, y: coords.bottom + 4 };
			aiPromptHasSelection = from !== to;
			aiPromptVisible = true;
		}
	}

	export function openAiPrompt() {
		showAiPrompt();
	}

	// Mount — only depends on editorEl
	$effect(() => {
		if (!editorEl) return;

		const initialContent = untrack(() => content);

		const ed = new Editor({
			element: editorEl,
			extensions: [
				StarterKit.configure({
					codeBlock: false,
				}),
				CodeBlockCM,
				BubbleMenu.configure({
					element: bubbleEl,
					updateDelay: 0,
					shouldShow: ({ editor: e }) => {
						if (searchOpen || pinned) return false;
						if (!e.view.hasFocus()) return false;
						if (e.state.selection.empty) return false;
						if (e.isActive("codeBlock")) return false;
						return true;
					},
					options: {
						strategy: "fixed",
						placement: "top-start",
						offset: { mainAxis: 24 },
						flip: { padding: 48, fallbackPlacements: ["bottom-start", "top-end", "bottom-end"] },
						shift: { padding: 8 },
						hide: true,
					},
				}),
				Link.configure({
					openOnClick: false,
					HTMLAttributes: { class: "jte-link" },
				}),
				Underline,
				TextAlign.configure({
					types: ["heading", "paragraph"],
				}),
				Spacing,
				TextStyle,
				Color,
				FontFamily,
				FontSize,
				Highlight.configure({
					multicolor: true,
				}),
				Image.configure({
					inline: false,
					allowBase64: true,
					resize: {
						enabled: true,
						alwaysPreserveAspectRatio: true,
					},
				}),
				Table.configure({
					resizable: true,
				}),
				TableRow,
				TableCell,
				TableHeader,
				Placeholder.configure({
					placeholder: "Type / for commands...",
				}),
				Typography,
				SlashMenu.configure({
					onOpen: (coords) => {
						slashCoords = coords;
						slashVisible = true;
					},
					onClose: () => {
						slashVisible = false;
						slashQuery = "";
					},
					onFilter: (q) => {
						slashQuery = q;
					},
				}),
				TiptapSearch.configure({
					onVisibilityChange: (open) => { searchOpen = open; },
				}),
				EmptyLineSelection,
			],
			content: initialContent || "",
			onUpdate: ({ editor: ed }) => {
				lastEmitted = ed.getHTML();
				onchange?.(lastEmitted);
			},
			onTransaction: () => { editorTick++; },
			editorProps: {
				handleKeyDown: (_view, event) => {
					// Route keyboard to slash menu when open
					if (slashVisible && slashMenuRef) {
						return slashMenuRef.handleKeydown(event);
					}
					return false;
				},
			},
		});

		editor = ed;
		lastEmitted = initialContent;

		return () => {
			editor?.destroy();
			editor = undefined;
		};
	});

	export function focusSearch() {
		if (!editor) return;
		editor.extensionStorage.jteSearch?.showPanel?.();
	}

	// Sync content from parent (tab switch)
	$effect(() => {
		if (!editor) return;
		const c = content;
		if (c !== lastEmitted && c !== editor.getHTML()) {
			editor.commands.setContent(c || "", false);
			lastEmitted = c;
		}
	});
</script>

<!-- Hidden bubble menu element — Tiptap positions it via tippy -->
<div bind:this={bubbleEl} style="visibility:hidden; position:absolute; z-index:100;">
	{#if editor && !pinned}
		<BubbleToolbar {editor} tick={editorTick} onpin={() => pinned = true} {aiActions} {aiGenerating} onaiaction={handleAiAction} onaistop={stopAi} />
	{/if}
</div>

<div class="jte-rich-wrap">
	{#if pinned && editor}
		<BubbleToolbar {editor} tick={editorTick} pinned={true} onpin={() => pinned = false} {aiActions} {aiGenerating} onaiaction={handleAiAction} onaistop={stopAi} />
	{/if}
	<div bind:this={editorEl} class="jte-rich-container" class:jte-page-view={pageWidth !== 'full'} class:jte-no-wrap={pageWidth === 'full' && !wordWrap} data-page-width={pageWidth}></div>
</div>

<!-- Slash command menu -->
<SlashMenuPopup
	bind:this={slashMenuRef}
	{editor}
	visible={slashVisible}
	coords={slashCoords}
	query={slashQuery}
/>

<!-- AI inline prompt (Ctrl+K) -->
<AiPrompt
	visible={aiPromptVisible}
	coords={aiPromptCoords}
	hasSelection={aiPromptHasSelection}
	onsubmit={handleAiGenerate}
	oncancel={() => { aiPromptVisible = false; }}
/>

<style>
	.jte-rich-wrap {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.jte-rich-container {
		flex: 1;
		overflow: auto;
		display: flex;
		flex-direction: column;
	}

	.jte-rich-container :global(.tiptap) {
		flex: 1;
		padding: 12px 16px;
		outline: none;
		color: var(--jte-fg, #d4d4d4);
		font-family: var(--jte-ui-font, system-ui, -apple-system, sans-serif);
		font-size: 15px;
		line-height: 1.6;
	}

	/* Page view — centered document with shadow */
	.jte-page-view {
		background: var(--jte-page-canvas, #181818);
		padding: 32px 40px;
	}

	.jte-page-view :global(.tiptap) {
		margin: 0 auto;
		padding: 48px 64px;
		background: var(--jte-page-color, var(--jte-menubar-bg, #252525));
		border: 1px solid var(--jte-border, #333);
		border-radius: 5px;
		box-shadow: 0 2px 16px rgba(0, 0, 0, 0.4);
		min-height: 1056px;
		flex: none;
	}

	/* Page width variants — fixed widths so the page scrolls instead of shrinking */
	.jte-rich-container[data-page-width="narrow"] :global(.tiptap) { width: 560px; }
	.jte-rich-container[data-page-width="normal"] :global(.tiptap) { width: 816px; }
	.jte-rich-container[data-page-width="wide"] :global(.tiptap)   { width: 1280px; }

	/* Full page, no word wrap — horizontal scroll */
	.jte-no-wrap :global(.tiptap) { white-space: nowrap; }
	.jte-no-wrap { overflow-x: auto; }

	.jte-rich-container :global(.tiptap > *:first-child) {
		margin-top: 0;
	}

	/* Paragraph — reset browser default margins so spacing extension has full control */
	.jte-rich-container :global(.tiptap p) {
		margin: 0;
	}

	/* Placeholder */
	.jte-rich-container :global(.tiptap p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: var(--jte-status-fg, #555);
		pointer-events: none;
		height: 0;
		font-style: italic;
	}

	/* Headings */
	.jte-rich-container :global(h1) { font-size: 1.8em; margin: 12px 0 8px; }
	.jte-rich-container :global(h2) { font-size: 1.4em; margin: 10px 0 6px; }
	.jte-rich-container :global(h3) { font-size: 1.2em; margin: 8px 0 4px; }

	/* Blockquote */
	.jte-rich-container :global(blockquote) {
		border-left: 3px solid var(--jte-accent, #569cd6);
		margin: 8px 0;
		padding: 4px 12px;
		color: var(--jte-status-fg, #888);
	}

	/* Code blocks */
	.jte-rich-container :global(pre) {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--jte-border, #333);
		border-radius: 4px;
		padding: 8px 12px;
		font-family: var(--jte-font, "Cascadia Code", "Fira Code", "Consolas", monospace);
		font-size: 14px;
		overflow-x: auto;
	}

	/* Inline code */
	.jte-rich-container :global(code) {
		background: rgba(255, 255, 255, 0.08);
		border-radius: 3px;
		padding: 2px 4px;
		font-family: var(--jte-font, "Cascadia Code", "Fira Code", "Consolas", monospace);
		font-size: 0.9em;
	}

	.jte-rich-container :global(pre code) {
		background: transparent;
		padding: 0;
	}

	/* Lists */
	.jte-rich-container :global(ul),
	.jte-rich-container :global(ol) {
		padding-left: 24px;
		margin: 4px 0;
	}

	/* Search matches */
	.jte-rich-container :global(.jte-search-match) {
		background: var(--jte-search-match, rgba(255, 200, 0, 0.25));
		border-radius: 2px;
	}

	.jte-rich-container :global(.jte-search-match-active) {
		background: var(--jte-search-match-active, rgba(255, 200, 0, 0.6));
		outline: 1px solid var(--jte-search-match-active, rgba(255, 200, 0, 0.8));
		border-radius: 2px;
	}

	/* Horizontal rule */
	.jte-rich-container :global(hr) {
		border: none;
		border-top: 1px solid var(--jte-border, #333);
		margin: 12px 0;
	}

	/* Links */
	.jte-rich-container :global(.jte-link) {
		color: var(--jte-accent, #569cd6);
		text-decoration: underline;
		text-decoration-color: rgba(86, 156, 214, 0.4);
		cursor: pointer;
	}

	.jte-rich-container :global(.jte-link:hover) {
		text-decoration-color: var(--jte-accent, #569cd6);
	}

	/* Highlight */
	.jte-rich-container :global(mark) {
		background: rgba(255, 200, 0, 0.3);
		border-radius: 2px;
		padding: 1px 2px;
	}

	/* Images */
	.jte-rich-container :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 4px;
		margin: 8px 0;
	}

	/* Image resize container */
	.jte-rich-container :global([data-resize-container]) {
		position: relative;
		display: inline-block;
		line-height: 0;
	}

	.jte-rich-container :global([data-resize-container][data-resize-state="true"]) {
		outline: 2px solid var(--jte-accent, #569cd6);
		outline-offset: 2px;
		border-radius: 4px;
	}

	/* Resize handles — corner dots */
	.jte-rich-container :global([data-resize-handle]) {
		width: 10px;
		height: 10px;
		background: var(--jte-accent, #569cd6);
		border: 1px solid var(--jte-bg, #1e1e1e);
		border-radius: 50%;
		z-index: 10;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.jte-rich-container :global([data-resize-container]:hover [data-resize-handle]),
	.jte-rich-container :global([data-resize-state="true"] [data-resize-handle]) {
		opacity: 1;
	}

	.jte-rich-container :global([data-resize-handle="top-left"]) { cursor: nwse-resize; transform: translate(-50%, -50%); }
	.jte-rich-container :global([data-resize-handle="top-right"]) { cursor: nesw-resize; transform: translate(50%, -50%); }
	.jte-rich-container :global([data-resize-handle="bottom-left"]) { cursor: nesw-resize; transform: translate(-50%, 50%); }
	.jte-rich-container :global([data-resize-handle="bottom-right"]) { cursor: nwse-resize; transform: translate(50%, 50%); }

	/* Lists */
	.jte-rich-container :global(ul) {
		list-style-type: disc;
	}

	.jte-rich-container :global(ol) {
		list-style-type: decimal;
	}

	.jte-rich-container :global(li) {
		margin: 2px 0;
	}

	.jte-rich-container :global(li p) {
		margin: 0;
	}

	/* Tables */
	.jte-rich-container :global(table) {
		border-collapse: separate;
		border-spacing: 0;
		margin: 8px 0;
		width: 100%;
		table-layout: fixed;
		overflow: hidden;
	}

	.jte-rich-container :global(th),
	.jte-rich-container :global(td) {
		border: 1px solid var(--jte-border, #444);
		padding: 6px 10px;
		text-align: left;
		position: relative;
		vertical-align: top;
	}

	.jte-rich-container :global(th) {
		background: rgba(255, 255, 255, 0.06);
		font-weight: 600;
	}

	.jte-rich-container :global(td) {
		background: transparent;
	}

	.jte-rich-container :global(.tableWrapper) {
		overflow-x: auto;
		margin: 8px 0;
	}

	/* Column resize handle */
	.jte-rich-container :global(.column-resize-handle) {
		position: absolute;
		right: -2px;
		top: 0;
		bottom: -2px;
		width: 4px;
		background: var(--jte-accent, #569cd6);
		pointer-events: none;
		z-index: 20;
	}

	.jte-rich-container :global(.resize-cursor) {
		cursor: col-resize;
	}

	/* Selected cells */
	.jte-rich-container :global(.selectedCell) {
		background: var(--jte-selection, rgba(86, 156, 214, 0.15));
	}

	/* Empty-line selection indicator */
	.jte-rich-container :global(.jte-empty-selected) {
		position: relative;
	}

	.jte-rich-container :global(.jte-empty-selected::after) {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 5px;
		background: var(--jte-selection-focused, rgba(38, 119, 204, 0.35));
		pointer-events: none;
		border-radius: 1px;
	}

	/* Scrollbar */
	.jte-rich-container::-webkit-scrollbar {
		width: 20px;
		height: 20px;
	}
	.jte-rich-container::-webkit-scrollbar-track {
		background: transparent;
	}
	.jte-rich-container::-webkit-scrollbar-thumb {
		border: 6px solid transparent;
		background-clip: padding-box;
		border-radius: 10px;
		background-color: var(--jte-scrollbar-thumb, rgba(255, 255, 255, 0.2));
	}
	.jte-rich-container::-webkit-scrollbar-thumb:hover {
		background-color: var(--jte-scrollbar-thumb-hover, rgba(255, 255, 255, 0.35));
	}

	/* FindBar — same visual as CM's .jte-find (injected by tiptap-search plugin) */
	.jte-rich-container :global(.jte-find) {
		display: flex;
		align-items: center;
		gap: 1px;
		padding: 0;
		background: var(--jte-menubar-bg, #353535);
		border: 1px solid var(--jte-border, #444);
		border-radius: 4px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
		font-family: var(--jte-ui-font, system-ui, -apple-system, sans-serif);
		font-size: 12px;
		overflow: hidden;
	}

	.jte-rich-container :global(.jte-find-input) {
		padding: 5px 10px;
		background: var(--jte-bg, #1e1e1e);
		border: none;
		color: var(--jte-fg, #d4d4d4);
		font-family: inherit;
		font-size: inherit;
		outline: none;
		width: 110px;
	}

	.jte-rich-container :global(.jte-find-input:focus) {
		background: var(--jte-input-focus-bg, #1a1a1a);
	}

	.jte-rich-container :global(.jte-find-input::selection) {
		background: var(--jte-selection-focused, rgba(38, 119, 204, 0.35));
	}

	.jte-rich-container :global(.jte-fo) {
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: var(--jte-toolbar-fg, #aaa);
		padding: 4px;
		cursor: pointer;
		line-height: 1;
	}

	.jte-rich-container :global(.jte-fo:hover) {
		color: var(--jte-fg, #d4d4d4);
	}

	.jte-rich-container :global(.jte-fo.on) {
		color: var(--jte-accent, #569cd6);
	}

	.jte-rich-container :global(.jte-fo .material-symbols-outlined) {
		font-size: 16px;
	}

	.jte-rich-container :global(.jte-find-sep) {
		width: 1px;
		height: 16px;
		background: var(--jte-border, #555);
		margin: 0 2px;
		flex-shrink: 0;
	}

	.jte-rich-container :global(.jte-match-count) {
		color: var(--jte-status-fg, #888);
		font-size: 11px;
		padding: 0 4px;
		white-space: nowrap;
	}
</style>
