import { Node, mergeAttributes } from "@tiptap/core";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, drawSelection } from "@codemirror/view";
import { defaultKeymap, historyKeymap } from "@codemirror/commands";
import { history } from "@codemirror/commands";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { TextSelection, Selection } from "@tiptap/pm/state";
import { jteThemeExtension } from "./cm-theme.js";
import { loadLanguage } from "./cm-languages.js";

/**
 * ProseMirror NodeView that renders a code block as a full CM6 editor.
 * Follows the canonical prosemirror-codemirror pattern.
 */
class CodeBlockView {
    constructor(node, pmView, getPos) {
        this.node = node;
        this.pmView = pmView;
        this.getPos = getPos;
        this.forwarding = false;

        const langCompartment = new Compartment();
        this.langCompartment = langCompartment;

        this.cm = new EditorView({
            state: EditorState.create({
                doc: node.textContent,
                extensions: [
                    jteThemeExtension,
                    history(),
                    drawSelection(),
                    indentOnInput(),
                    bracketMatching(),
                    closeBrackets(),
                    keymap.of([
                        ...this.codeMirrorKeymap(),
                        ...closeBracketsKeymap,
                        ...defaultKeymap,
                        ...historyKeymap,
                    ]),
                    langCompartment.of([]),
                    EditorView.lineWrapping,
                    EditorView.updateListener.of((update) => this.forwardUpdate(update)),
                ],
            }),
        });

        // Wrapper DOM
        this.dom = document.createElement("div");
        this.dom.classList.add("jte-cm-codeblock");
        this.dom.appendChild(this.cm.dom);

        // Load language from node attrs
        const lang = node.attrs.language;
        if (lang) {
            loadLanguage(lang).then((l) => {
                if (l && this.cm) {
                    this.cm.dispatch({ effects: langCompartment.reconfigure(l) });
                }
            });
        }
    }

    /** Forward CM changes to ProseMirror */
    forwardUpdate(update) {
        if (this.forwarding || !this.cm.hasFocus) return;

        const offset = this.getPos() + 1;
        const { main } = update.state.selection;
        const selFrom = offset + main.from;
        const selTo = offset + main.to;
        const pmSel = this.pmView.state.selection;

        if (update.docChanged || pmSel.from !== selFrom || pmSel.to !== selTo) {
            const tr = this.pmView.state.tr;
            let adjust = 0;

            update.changes.iterChanges((fromA, toA, _fromB, _toB, text) => {
                const from = offset + fromA + adjust;
                const to = offset + toA + adjust;
                const textStr = text.toString();
                if (textStr.length) {
                    tr.replaceWith(from, to, this.pmView.state.schema.text(textStr));
                } else {
                    tr.delete(from, to);
                }
                adjust += textStr.length - (toA - fromA);
            });

            const resolvedFrom = tr.doc.resolve(Math.min(selFrom + adjust, tr.doc.content.size));
            const resolvedTo = tr.doc.resolve(Math.min(selTo + adjust, tr.doc.content.size));
            tr.setSelection(TextSelection.create(tr.doc, resolvedFrom.pos, resolvedTo.pos));
            this.pmView.dispatch(tr);
        }
    }

    /** Sync ProseMirror changes back to CM */
    update(node) {
        if (node.type.name !== this.node.type.name) return false;
        this.node = node;
        if (this.forwarding) return true;

        const newText = node.textContent;
        const curText = this.cm.state.doc.toString();

        if (newText !== curText) {
            let start = 0;
            let curEnd = curText.length;
            let newEnd = newText.length;

            while (start < curEnd && curText.charCodeAt(start) === newText.charCodeAt(start)) {
                start++;
            }
            while (curEnd > start && newEnd > start && curText.charCodeAt(curEnd - 1) === newText.charCodeAt(newEnd - 1)) {
                curEnd--;
                newEnd--;
            }

            this.forwarding = true;
            this.cm.dispatch({
                changes: { from: start, to: curEnd, insert: newText.slice(start, newEnd) },
            });
            this.forwarding = false;
        }

        // Update language if changed
        const lang = node.attrs.language;
        if (lang !== this.node.attrs?.language) {
            loadLanguage(lang).then((l) => {
                if (this.cm) {
                    this.cm.dispatch({ effects: this.langCompartment.reconfigure(l || []) });
                }
            });
        }

        return true;
    }

    /** Focus CM when PM selects this node */
    selectNode() {
        this.cm.focus();
    }

    /** Move CM selection */
    setSelection(anchor, head) {
        this.forwarding = true;
        this.cm.dispatch({ selection: { anchor, head } });
        this.forwarding = false;
        this.cm.focus();
    }

    /** Prevent PM from handling CM events */
    stopEvent() {
        return true;
    }

    /** Keybindings for escaping the code block */
    codeMirrorKeymap() {
        return [
            { key: "ArrowUp", run: () => this.maybeEscape("line", -1) },
            { key: "ArrowLeft", run: () => this.maybeEscape("char", -1) },
            { key: "ArrowDown", run: () => this.maybeEscape("line", 1) },
            { key: "ArrowRight", run: () => this.maybeEscape("char", 1) },
            {
                key: "Ctrl-Enter",
                mac: "Cmd-Enter",
                run: () => {
                    const pos = this.getPos() + this.node.nodeSize;
                    const tr = this.pmView.state.tr;
                    const paragraph = this.pmView.state.schema.nodes.paragraph.create();
                    tr.insert(pos, paragraph);
                    tr.setSelection(TextSelection.create(tr.doc, pos + 1));
                    this.pmView.dispatch(tr);
                    this.pmView.focus();
                    return true;
                },
            },
            {
                key: "Backspace",
                run: () => {
                    // If code block is empty, convert to paragraph
                    if (this.cm.state.doc.length === 0) {
                        const pos = this.getPos();
                        const tr = this.pmView.state.tr;
                        const paragraph = this.pmView.state.schema.nodes.paragraph.create();
                        tr.replaceWith(pos, pos + this.node.nodeSize, paragraph);
                        tr.setSelection(TextSelection.create(tr.doc, pos + 1));
                        this.pmView.dispatch(tr);
                        this.pmView.focus();
                        return true;
                    }
                    return false;
                },
            },
        ];
    }

    /** Escape from code block when cursor is at boundary */
    maybeEscape(unit, dir) {
        const { state } = this.cm;
        const { main } = state.selection;
        if (!main.empty) return false;

        const line = unit === "line" ? state.doc.lineAt(main.head) : main;
        if (dir < 0 ? line.from > 0 : line.to < state.doc.length) return false;

        const targetPos = this.getPos() + (dir < 0 ? 0 : this.node.nodeSize);
        const sel = Selection.near(this.pmView.state.doc.resolve(targetPos), dir);
        const tr = this.pmView.state.tr.setSelection(sel).scrollIntoView();
        this.pmView.dispatch(tr);
        this.pmView.focus();
        return true;
    }

    destroy() {
        this.cm.destroy();
    }
}

/**
 * TipTap extension: CodeBlock with embedded CodeMirror 6 instances.
 * Replaces the default CodeBlock node with CM-powered editing.
 */
export const CodeBlockCM = Node.create({
    name: "codeBlock",
    group: "block",
    content: "text*",
    marks: "",
    code: true,
    defining: true,

    addAttributes() {
        return {
            language: {
                default: null,
                parseHTML: (el) => el.getAttribute("data-language"),
                renderHTML: (attrs) => {
                    if (!attrs.language) return {};
                    return { "data-language": attrs.language };
                },
            },
        };
    },

    parseHTML() {
        return [{ tag: "pre", preserveWhitespace: "full" }];
    },

    renderHTML({ HTMLAttributes }) {
        return ["pre", mergeAttributes(HTMLAttributes), ["code", 0]];
    },

    addNodeView() {
        return ({ node, view, getPos }) => new CodeBlockView(node, view, getPos);
    },

    addInputRules() {
        return [
            {
                // Triple backtick with optional language: ```js
                find: /^```([a-zA-Z0-9]*)\s$/,
                handler: ({ state, range, match }) => {
                    const language = match[1] || null;
                    const tr = state.tr.delete(range.from, range.to);
                    const node = this.type.create({ language });
                    tr.replaceSelectionWith(node);
                    return tr;
                },
            },
        ];
    },

    addKeyboardShortcuts() {
        return {
            "Mod-Alt-c": () => this.editor.commands.toggleCodeBlock(),
        };
    },

    addCommands() {
        return {
            setCodeBlock:
                (attributes) =>
                ({ commands }) =>
                    commands.setNode(this.name, attributes),
            toggleCodeBlock:
                (attributes) =>
                ({ commands }) =>
                    commands.toggleNode(this.name, "paragraph", attributes),
        };
    },
});
