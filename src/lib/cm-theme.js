import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/** Editor chrome theme using --jte-* CSS custom properties */
export const jteTheme = EditorView.theme(
    {
        "&": {
            backgroundColor: "var(--jte-bg, #1e1e1e)",
            color: "var(--jte-fg, #d4d4d4)",
            height: "100%",
            fontSize: "var(--jte-font-size, 14px)",
        },
        ".cm-content": {
            fontFamily:
                'var(--jte-font, "Cascadia Code", "Fira Code", "Consolas", monospace)',
            lineHeight: "var(--jte-line-height, 1.5)",
            padding: "8px 0",
            caretColor: "var(--jte-fg, #d4d4d4)",
        },
        ".cm-activeLine": {
            backgroundColor: "var(--jte-active-line, rgba(255, 255, 255, 0.04))",
        },
        ".cm-gutters": {
            backgroundColor: "var(--jte-bg, #1e1e1e)",
            color: "var(--jte-gutter-fg, #555)",
            borderRight: "1px solid var(--jte-border, #333)",
            fontFamily:
                'var(--jte-font, "Cascadia Code", "Fira Code", "Consolas", monospace)',
            fontSize: "var(--jte-font-size, 14px)",
            lineHeight: "var(--jte-line-height, 1.5)",
        },
        ".cm-activeLineGutter": {
            color: "var(--jte-fg, #d4d4d4)",
            backgroundColor: "transparent",
        },
        ".cm-lineNumbers .cm-gutterElement": {
            padding: "0 8px 0 12px",
        },
        // Search panel — floating top-right
        ".cm-panels": {
            backgroundColor: "transparent",
            border: "none",
        },
        ".cm-panels-top": {
            borderBottom: "none",
        },
        // Match highlights
        ".cm-searchMatch": {
            backgroundColor: "var(--jte-search-match, rgba(255, 200, 0, 0.25))",
            borderRadius: "2px",
        },
        ".cm-searchMatch-selected": {
            backgroundColor: "var(--jte-search-match-active, rgba(255, 200, 0, 0.6))",
            outline: "1px solid var(--jte-search-match-active, rgba(255, 200, 0, 0.8))",
            borderRadius: "2px",
        },
        // FindBar panel
        ".jte-find": {
            position: "absolute",
            top: "8px",
            right: "8px",
            zIndex: "50",
            display: "flex",
            alignItems: "center",
            gap: "1px",
            padding: "0",
            background: "var(--jte-menubar-bg, #353535)",
            border: "1px solid var(--jte-border, #444)",
            borderRadius: "4px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
            fontFamily: "var(--jte-ui-font, system-ui, -apple-system, sans-serif)",
            fontSize: "12px",
            overflow: "hidden",
        },
        ".jte-find-input": {
            padding: "5px 10px",
            background: "var(--jte-bg, #1e1e1e)",
            border: "none",
            color: "var(--jte-fg, #d4d4d4)",
            fontFamily: "inherit",
            fontSize: "inherit",
            outline: "none",
            width: "110px",
        },
        ".jte-find-input:focus": {
            background: "var(--jte-input-focus-bg, #1a1a1a)",
        },
        ".jte-find-input::selection": {
            backgroundColor: "var(--jte-selection-focused, rgba(38, 119, 204, 0.35))",
        },
        ".jte-fo": {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            color: "var(--jte-toolbar-fg, #aaa)",
            padding: "4px",
            cursor: "pointer",
            lineHeight: "1",
        },
        ".jte-fo:hover": {
            color: "var(--jte-fg, #d4d4d4)",
        },
        ".jte-fo.on": {
            color: "var(--jte-accent, #569cd6)",
        },
        ".jte-fo .material-symbols-outlined": {
            fontSize: "16px",
        },
        ".jte-find-sep": {
            width: "1px",
            height: "16px",
            background: "var(--jte-border, #555)",
            margin: "0 2px",
            flexShrink: "0",
        },
        ".jte-match-count": {
            color: "var(--jte-status-fg, #888)",
            fontSize: "11px",
            padding: "0 4px",
            whiteSpace: "nowrap",
        },
        // Bracket matching
        "&.cm-focused .cm-matchingBracket": {
            backgroundColor: "var(--jte-bracket-match-bg, rgba(255, 255, 255, 0.1))",
            outline: "1px solid var(--jte-bracket-match-border, rgba(255, 255, 255, 0.3))",
        },
        // Scrollbars
        ".cm-scroller": {
            fontFamily:
                'var(--jte-font, "Cascadia Code", "Fira Code", "Consolas", monospace)',
            overflow: "auto",
        },
        ".cm-scroller::-webkit-scrollbar": {
            width: "20px",
            height: "20px",
        },
        ".cm-scroller::-webkit-scrollbar-track": {
            background: "transparent",
        },
        ".cm-scroller::-webkit-scrollbar-thumb": {
            border: "6px solid transparent",
            backgroundClip: "padding-box",
            borderRadius: "10px",
            backgroundColor: "var(--jte-scrollbar-thumb, rgba(255, 255, 255, 0.2))",
        },
        ".cm-scroller::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "var(--jte-scrollbar-thumb-hover, rgba(255, 255, 255, 0.35))",
        },
        ".cm-scroller::-webkit-scrollbar-corner": {
            background: "transparent",
        },
        // Tab size
        ".cm-content, .cm-line": {
            tabSize: "var(--jte-tab-size, 4)",
        },
    },
    { dark: true },
);

/** Syntax highlight colors using CSS custom properties for theme reactivity */
export const jteHighlightStyle = HighlightStyle.define([
    { tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment], color: "var(--jte-syntax-comment, #6a9955)" },
    { tag: tags.punctuation, color: "var(--jte-syntax-punctuation, #ff66bb)" },
    { tag: [tags.propertyName, tags.tagName, tags.bool, tags.number, tags.atom, tags.constant(tags.variableName)], color: "var(--jte-syntax-property, #b5cea8)" },
    { tag: [tags.attributeName, tags.string, tags.character, tags.special(tags.string)], color: "var(--jte-syntax-string, #ce9178)" },
    { tag: [tags.operator, tags.url, tags.escape], color: "var(--jte-syntax-operator, #d4d4d4)" },
    { tag: [tags.keyword, tags.modifier, tags.operatorKeyword, tags.controlKeyword, tags.definitionKeyword, tags.moduleKeyword], color: "var(--jte-syntax-keyword, #569cd6)" },
    { tag: [tags.function(tags.variableName), tags.className, tags.typeName, tags.definition(tags.typeName)], color: "var(--jte-syntax-function, #decc88)" },
    { tag: [tags.regexp, tags.variableName], color: "var(--jte-syntax-variable, #d16969)" },
    { tag: tags.meta, color: "var(--jte-syntax-meta, #569cd6)" },
]);

/** Combined theme + highlighting as a single extension */
export const jteThemeExtension = [jteTheme, syntaxHighlighting(jteHighlightStyle)];
