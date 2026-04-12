import { lineNumbers, highlightActiveLine, highlightActiveLineGutter, keymap } from "@codemirror/view";
import { EditorView } from "@codemirror/view";
import { history, defaultKeymap, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { search, searchKeymap } from "@codemirror/search";
import { jteThemeExtension } from "./cm-theme.js";
import { createJteSearchPanel } from "./cm-search-panel.js";

/**
 * Curated CM6 extension bundle for JTextEditor.
 * Returns an array of extensions based on options.
 */
export function jteSetup({
    lineNums = true,
    activeLine = true,
    wordWrap = false,
    readOnly = false,
} = {}) {
    const extensions = [
        // Theme + syntax highlighting
        jteThemeExtension,
        // Core editing
        history(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        // Custom search panel matching JTE FindBar design
        search({ createPanel: createJteSearchPanel, top: true }),
        // Keymaps
        keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            indentWithTab,
        ]),
    ];

    if (lineNums) {
        extensions.push(lineNumbers());
    }
    if (activeLine) {
        extensions.push(highlightActiveLine(), highlightActiveLineGutter());
    }
    if (wordWrap) {
        extensions.push(EditorView.lineWrapping);
    }
    if (readOnly) {
        extensions.push(EditorView.editable.of(false));
    }

    return extensions;
}
