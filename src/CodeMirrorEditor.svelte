<script>
    import { untrack } from "svelte";
    import { EditorView } from "@codemirror/view";
    import { EditorState, Compartment } from "@codemirror/state";
    import { lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
    import { openSearchPanel } from "@codemirror/search";
    import { undo, redo } from "@codemirror/commands";
    import { jteSetup } from "./lib/cm-setup.js";
    import { loadLanguage } from "./lib/cm-languages.js";
    import { invisiblesPlugin } from "./lib/cm-invisibles.js";

    let {
        content = "",
        language = "",
        showInvisibles = false,
        showLineNumbers = true,
        wordWrap = false,
        highlightLine = true,
        onchange,
        oncursor,
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

    // Mount editor — only depends on `container`, reads props via untrack
    $effect(() => {
        if (!container) return;

        const initialContent = untrack(() => content);
        const initialLineNums = untrack(() => showLineNumbers);
        const initialWrap = untrack(() => wordWrap);
        const initialHighlight = untrack(() => highlightLine);
        const initialInvisibles = untrack(() => showInvisibles);
        const initialLang = untrack(() => language);

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
                invisiblesCompartment.of(initialInvisibles ? invisiblesPlugin : []),
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
            effects: invisiblesCompartment.reconfigure(showInvisibles ? invisiblesPlugin : []),
        });
    });

    export function focusSearch() {
        if (view) openSearchPanel(view);
    }

    export function execCommand(cmd) {
        if (!view) return;
        if (cmd === "undo") undo(view);
        else if (cmd === "redo") redo(view);
    }

    export function focus() {
        view?.focus();
    }
</script>

<div bind:this={container} class="jte-cm-container"></div>

<style>
    .jte-cm-container {
        flex: 1;
        overflow: hidden;
        display: flex;
    }
    .jte-cm-container :global(.cm-editor) {
        flex: 1;
    }
    /* Invisible character styling */
    .jte-cm-container :global(.jte-invisible) {
        opacity: 0.4;
        font-size: 0.85em;
    }
    .jte-cm-container :global(.jte-invisible-space) {
        color: var(--jte-gutter-fg, #555);
    }
    .jte-cm-container :global(.jte-invisible-tab) {
        color: var(--jte-gutter-fg, #555);
    }
    .jte-cm-container :global(.jte-invisible-control) {
        color: #d16969;
        background: rgba(209, 105, 105, 0.15);
        border-radius: 2px;
        padding: 0 2px;
    }
</style>
