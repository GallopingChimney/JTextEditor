<script>
    import { untrack } from "svelte";
    import { EditorView, highlightSpecialChars } from "@codemirror/view";
    import { EditorState, Compartment, Transaction } from "@codemirror/state";
    import { lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
    import { openSearchPanel, closeSearchPanel, searchPanelOpen } from "@codemirror/search";
    import { undo, redo } from "@codemirror/commands";
    import { jteSetup, detectIndent } from "./lib/cm-setup.js";
    import { loadLanguage } from "./lib/cm-languages.js";
    import { indentUnit } from "@codemirror/language";
    import { indentationMarkers } from "@replit/codemirror-indentation-markers";
    import { buildContext } from "./lib/ai-context.js";
    import { getActions } from "./lib/ai-actions.js";
    import AiPrompt from "./AiPrompt.svelte";

    let {
        content = "",
        language = "",
        showInvisibles = false,
        showLineNumbers = true,
        wordWrap = false,
        highlightLine = true,
        showIndentGuides = true,
        onchange,
        oncursor,
        ai = null,
    } = $props();

    let container = $state();
    let view = $state();
    let lastEmitted = "";

    // Compartments for dynamic reconfiguration
    const langCompartment = new Compartment();
    const lineNumCompartment = new Compartment();
    const wrapCompartment = new Compartment();
    const activeLineCompartment = new Compartment();
    const invisiblesCompartment = new Compartment();
    const indentGuidesCompartment = new Compartment();
    const tabSizeCompartment = new Compartment();
    const indentUnitCompartment = new Compartment();

    function applyDetectedIndent(text) {
        if (!view) return;
        const detected = detectIndent(text);
        view.dispatch({ effects: [
            indentUnitCompartment.reconfigure(indentUnit.of(detected.unit)),
            tabSizeCompartment.reconfigure(EditorState.tabSize.of(detected.tabSize)),
        ]});
    }

    const indentGuidesExt = indentationMarkers({
        thickness: 2,
        colors: {
            light: "#E0E0E0",
            dark: "rgba(255, 255, 255, 0.08)",
            activeLight: "#C0C0C0",
            activeDark: "rgba(255, 255, 255, 0.18)",
        },
    });

    // Mount editor — only depends on `container`, reads props via untrack
    $effect(() => {
        if (!container) return;

        const initialContent = untrack(() => content);
        const initialLineNums = untrack(() => showLineNumbers);
        const initialWrap = untrack(() => wordWrap);
        const initialHighlight = untrack(() => highlightLine);
        const initialInvisibles = untrack(() => showInvisibles);
        const initialIndentGuides = untrack(() => showIndentGuides);
        const initialLang = untrack(() => language);
        const detected = detectIndent(initialContent);

        const state = EditorState.create({
            doc: initialContent,
            extensions: [
                jteSetup({
                    lineNums: false,    // managed by compartment
                    activeLine: false,  // managed by compartment
                    wordWrap: false,    // managed by compartment
                }),
                langCompartment.of([]),
                lineNumCompartment.of(initialLineNums ? lineNumbers() : []),
                wrapCompartment.of(initialWrap ? EditorView.lineWrapping : []),
                activeLineCompartment.of(
                    initialHighlight ? [highlightActiveLine(), highlightActiveLineGutter()] : [],
                ),
                invisiblesCompartment.of(initialInvisibles ? highlightSpecialChars() : []),
                indentGuidesCompartment.of(initialIndentGuides ? indentGuidesExt : []),
                tabSizeCompartment.of(EditorState.tabSize.of(detected.tabSize)),
                indentUnitCompartment.of(indentUnit.of(detected.unit)),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        lastEmitted = update.state.doc.toString();
                        onchange?.(lastEmitted);
                    }
                    if (update.selectionSet || update.docChanged) {
                        const head = update.state.selection.main.head;
                        const line = update.state.doc.lineAt(head);
                        oncursor?.({
                            line: line.number,
                            col: head - line.from + 1,
                        });
                    }
                }),
            ],
        });

        view = new EditorView({ state, parent: container });
        lastEmitted = initialContent;

        // Load initial language
        if (initialLang) {
            loadLanguage(initialLang).then((lang) => {
                if (lang && view) {
                    view.dispatch({ effects: langCompartment.reconfigure(lang) });
                }
            });
        }

        return () => {
            view?.destroy();
            view = undefined;
        };
    });

    $effect(() => {
        if (!view) return;
        const c = content;
        if (c !== lastEmitted && c !== view.state.doc.toString()) {
            view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: c },
            });
            lastEmitted = c;
            // Re-detect indentation on full document swap
            applyDetectedIndent(c);
        }
    });

    $effect(() => {
        if (!view) return;
        const lang = language;
        loadLanguage(lang).then((l) => {
            if (view) {
                view.dispatch({ effects: langCompartment.reconfigure(l || []) });
            }
        });
    });

    $effect(() => {
        if (!view) return;
        view.dispatch({
            effects: lineNumCompartment.reconfigure(showLineNumbers ? lineNumbers() : []),
        });
    });

    $effect(() => {
        if (!view) return;
        view.dispatch({
            effects: wrapCompartment.reconfigure(wordWrap ? EditorView.lineWrapping : []),
        });
    });

    $effect(() => {
        if (!view) return;
        view.dispatch({
            effects: activeLineCompartment.reconfigure(
                highlightLine ? [highlightActiveLine(), highlightActiveLineGutter()] : [],
            ),
        });
    });

    $effect(() => {
        if (!view) return;
        view.dispatch({
            effects: invisiblesCompartment.reconfigure(showInvisibles ? highlightSpecialChars() : []),
        });
    });

    $effect(() => {
        if (!view) return;
        view.dispatch({
            effects: indentGuidesCompartment.reconfigure(showIndentGuides ? indentGuidesExt : []),
        });
    });

    export function focusSearch() {
        if (view) openSearchPanel(view);
    }

    export function toggleSearch() {
        if (!view) return;
        if (searchPanelOpen(view.state)) closeSearchPanel(view);
        else openSearchPanel(view);
    }

    export function execCommand(cmd) {
        if (!view) return;
        if (cmd === "undo") undo(view);
        else if (cmd === "redo") redo(view);
    }

    export function focus() {
        view?.focus();
    }

    // AI state
    let aiGenerating = $state(false);
    let aiAbort = $state(null);
    let aiPromptVisible = $state(false);
    let aiPromptCoords = $state(null);
    let aiPromptHasSelection = $state(false);

    export function getAiState() {
        return { generating: aiGenerating, actions: ai ? getActions("plain") : [] };
    }

    function getEditorContext() {
        if (!view) return null;
        const doc = view.state.doc.toString();
        const { from, to } = view.state.selection.main;
        const selection = from !== to ? doc.slice(from, to) : "";
        return buildContext({ content: doc, selection, cursorOffset: to, mode: "plain", language });
    }

    export async function handleAiAction(action) {
        if (!ai?.transform || !view) return;
        const ctx = getEditorContext();
        if (!ctx?.selection) return;
        await runAiStream(ai.transform(ctx, action.instruction), true);
    }

    async function handleAiGenerate(prompt, opts) {
        aiPromptVisible = false;
        if (!ai?.generate || !view) return;
        const ctx = getEditorContext();
        await runAiStream(ai.generate(ctx, prompt), opts?.replace ?? false);
    }

    async function runAiStream(iterable, replaceSelection) {
        if (!iterable || !view) return;
        const abort = new AbortController();
        aiAbort = abort;
        aiGenerating = true;

        try {
            const { from, to } = view.state.selection.main;
            let insertPos;

            if (replaceSelection) {
                view.dispatch({
                    changes: { from, to, insert: "" },
                    annotations: Transaction.userEvent.of("input.ai"),
                });
                insertPos = from;
            } else if (from !== to) {
                // Insert below selection with blank line spacing
                view.dispatch({
                    changes: { from: to, to, insert: "\n\n" },
                    annotations: Transaction.userEvent.of("input.ai"),
                });
                insertPos = to + 2;
            } else {
                insertPos = to;
            }

            for await (const chunk of iterable) {
                if (abort.signal.aborted) break;
                view.dispatch({
                    changes: { from: insertPos, to: insertPos, insert: chunk },
                    annotations: Transaction.userEvent.of("input.ai"),
                });
                insertPos += chunk.length;
            }
        } finally {
            aiGenerating = false;
            aiAbort = null;
        }
    }

    export function stopAi() {
        aiAbort?.abort();
    }

    export function openAiPrompt() {
        if (!view) return;
        const { head, from, to } = view.state.selection.main;
        const coords = view.coordsAtPos(head);
        if (coords) {
            aiPromptCoords = { x: coords.left, y: coords.bottom + 4 };
            aiPromptHasSelection = from !== to;
            aiPromptVisible = true;
        }
    }
</script>

<div bind:this={container} class="jte-cm-container"></div>

<!-- AI inline prompt (Ctrl+K) -->
<AiPrompt
    visible={aiPromptVisible}
    coords={aiPromptCoords}
    hasSelection={aiPromptHasSelection}
    onsubmit={handleAiGenerate}
    oncancel={() => { aiPromptVisible = false; }}
/>

<style>
    .jte-cm-container {
        flex: 1;
        position: relative;
        overflow: hidden;
    }
    .jte-cm-container :global(.cm-editor) {
        position: absolute;
        inset: 0;
    }
</style>
