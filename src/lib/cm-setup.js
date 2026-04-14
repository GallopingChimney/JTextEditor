import { lineNumbers, highlightActiveLine, highlightActiveLineGutter, keymap, rectangularSelection, crosshairCursor } from "@codemirror/view";
import { EditorView } from "@codemirror/view";
import { history, defaultKeymap, historyKeymap, insertTab, indentLess, indentMore } from "@codemirror/commands";
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from "@codemirror/language";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { highlightSelectionMatches, search, searchKeymap } from "@codemirror/search";
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
    search: enableSearch = true,
} = {}) {
    const extensions = [
        // Theme + syntax highlighting
        jteThemeExtension,
        // Core editing
        history(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        highlightSelectionMatches(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        // Keymaps
        keymap.of([
            ...closeBracketsKeymap,
            ...completionKeymap,
            ...foldKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            // Smart Tab: selection → indent/outdent line(s), pure caret → insert at cursor
            { key: "Tab", run: (view) => {
                const { from, to } = view.state.selection.main;
                if (from !== to) return indentMore(view);
                return insertTab(view);
            }, shift: indentLess },
        ]),
    ];

    // Search panel (standalone editor uses custom panel; code blocks skip it)
    if (enableSearch) {
        extensions.push(search({ createPanel: createJteSearchPanel, top: true }));
    }

    if (lineNums) {
        extensions.push(lineNumbers(), foldGutter());
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

/**
 * Detect indentation style from file content.
 * Scans up to 100 indented lines, votes tabs vs spaces, measures space width.
 * @param {string} text
 * @returns {{ unit: string, tabSize: number }}
 */
export function detectIndent(text) {
	let tabs = 0, spaces = 0;
	const widths = new Map(); // space-indent width → count
	const lines = text.split("\n");
	const limit = Math.min(lines.length, 500);

	for (let i = 0; i < limit; i++) {
		const line = lines[i];
		if (!line || !line.trimEnd()) continue;
		const leading = line.match(/^(\s+)/);
		if (!leading) continue;
		const ws = leading[1];
		if (ws[0] === "\t") {
			tabs++;
		} else if (ws[0] === " ") {
			spaces++;
			const len = ws.length;
			// Look for the indent delta from previous non-empty line
			for (let j = i - 1; j >= 0; j--) {
				const prev = lines[j];
				if (!prev || !prev.trimEnd()) continue;
				const prevLead = prev.match(/^(\s*)/)[1];
				if (prevLead[0] === "\t") break; // mixed, skip
				const delta = Math.abs(len - prevLead.length);
				if (delta > 0 && delta <= 8) {
					widths.set(delta, (widths.get(delta) || 0) + 1);
				}
				break;
			}
		}
	}

	if (tabs > spaces) {
		return { unit: "\t", tabSize: 4 };
	}

	if (spaces > 0) {
		// Find the most common indent width
		let bestWidth = 4, bestCount = 0;
		for (const [w, c] of widths) {
			if (c > bestCount) { bestCount = c; bestWidth = w; }
		}
		return { unit: " ".repeat(bestWidth), tabSize: bestWidth };
	}

	// Fallback
	return { unit: "    ", tabSize: 4 };
}
