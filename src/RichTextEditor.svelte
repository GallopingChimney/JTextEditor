<script>
    import { untrack } from "svelte";
    import { Editor } from "@tiptap/core";
    import StarterKit from "@tiptap/starter-kit";
    import { CodeBlockCM } from "./lib/tiptap-cm-codeblock.js";

    let { content = "", onchange } = $props();

    let editorEl = $state();
    let editor = $state();
    let lastEmitted = "";

    // Mount — only depends on editorEl
    $effect(() => {
        if (!editorEl) return;

        const initialContent = untrack(() => content);

        editor = new Editor({
            element: editorEl,
            extensions: [
                StarterKit.configure({
                    codeBlock: false,
                }),
                CodeBlockCM,
            ],
            content: initialContent || "",
            onUpdate: ({ editor: ed }) => {
                lastEmitted = ed.getHTML();
                onchange?.(lastEmitted);
            },
        });

        lastEmitted = initialContent;

        return () => {
            editor?.destroy();
            editor = undefined;
        };
    });

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

<div bind:this={editorEl} class="jte-rich-container"></div>

<style>
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

    .jte-rich-container :global(.tiptap > *:first-child) {
        margin-top: 0;
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

    /* Horizontal rule */
    .jte-rich-container :global(hr) {
        border: none;
        border-top: 1px solid var(--jte-border, #333);
        margin: 12px 0;
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
        background-color: rgba(255, 255, 255, 0.2);
    }
    .jte-rich-container::-webkit-scrollbar-thumb:hover {
        background-color: rgba(255, 255, 255, 0.35);
    }
</style>
