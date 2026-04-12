import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/**
 * TipTap search/replace — mirrors the CM6 FindBar UI.
 * Uses the same .jte-find CSS classes for visual consistency.
 *
 * Decorations are computed directly in the `decorations` prop from
 * closure state — no transactions dispatched for search updates,
 * so the panel never loses focus.
 */

const searchKey = new PluginKey("jteSearch");

function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k.startsWith("on")) e[k] = v;
        else if (k === "className") e.className = v;
        else e.setAttribute(k, v);
    }
    for (const c of children) {
        if (typeof c === "string") e.appendChild(document.createTextNode(c));
        else e.appendChild(c);
    }
    return e;
}

function icon(name) {
    return el("span", { className: "material-symbols-outlined" }, [name]);
}

/** Find all matches in the document */
function findMatches(doc, search, caseSensitive, wholeWord, useRegexp) {
    if (!search) return [];
    const text = doc.textBetween(0, doc.content.size, "\n", "\ufffc");
    const matches = [];

    if (useRegexp) {
        try {
            const re = new RegExp(search, caseSensitive ? "g" : "gi");
            let m;
            while ((m = re.exec(text)) !== null) {
                if (m[0].length === 0) { re.lastIndex++; continue; }
                matches.push({ from: m.index, to: m.index + m[0].length });
            }
        } catch { return []; }
    } else {
        const haystack = caseSensitive ? text : text.toLowerCase();
        const needle = caseSensitive ? search : search.toLowerCase();
        let pos = 0;
        while (pos <= haystack.length - needle.length) {
            const idx = haystack.indexOf(needle, pos);
            if (idx === -1) break;
            if (wholeWord) {
                const before = idx > 0 ? haystack[idx - 1] : " ";
                const after = idx + needle.length < haystack.length ? haystack[idx + needle.length] : " ";
                if (/\w/.test(before) || /\w/.test(after)) { pos = idx + 1; continue; }
            }
            matches.push({ from: idx, to: idx + needle.length });
            pos = idx + 1;
        }
    }
    return matches;
}

/** Map flat text offsets to ProseMirror positions */
function textToPmPos(doc, flatFrom, flatTo) {
    let offset = 0;
    let pmFrom = null, pmTo = null;

    doc.descendants((node, pos) => {
        if (pmTo !== null) return false;
        if (node.isText) {
            const start = offset;
            const end = offset + node.nodeSize;
            if (pmFrom === null && flatFrom >= start && flatFrom < end) {
                pmFrom = pos + (flatFrom - start);
            }
            if (pmFrom !== null && flatTo >= start && flatTo <= end) {
                pmTo = pos + (flatTo - start);
            }
            offset = end;
        } else if (node.isBlock && offset > 0) {
            offset++; // newline separator
        }
    });
    return pmFrom !== null && pmTo !== null ? { from: pmFrom, to: pmTo } : null;
}

export const TiptapSearch = Extension.create({
    name: "jteSearch",

    addOptions() {
        return {
            onVisibilityChange: () => {},
        };
    },

    addStorage() {
        return { showPanel: null };
    },

    addProseMirrorPlugins() {
        const ext = this;
        let panelEl = null;
        let containerEl = null;
        let editorView = null;
        let searchField, replaceField, caseBtn, wordBtn, reBtn, matchCount;
        let visible = false;
        let searchVersion = 0;

        function getSearchState() {
            return {
                search: searchField?.value || "",
                replace: replaceField?.value || "",
                caseSensitive: caseBtn?.classList.contains("on") || false,
                wholeWord: wordBtn?.classList.contains("on") || false,
                regexp: reBtn?.classList.contains("on") || false,
            };
        }

        function buildDecorations(state) {
            if (!visible || !searchField?.value) return DecorationSet.empty;
            const s = getSearchState();
            const matches = findMatches(state.doc, s.search, s.caseSensitive, s.wholeWord, s.regexp);
            const decos = [];
            const { from: selFrom } = state.selection;

            for (const m of matches) {
                const pmPos = textToPmPos(state.doc, m.from, m.to);
                if (!pmPos) continue;
                const isActive = pmPos.from === selFrom;
                decos.push(Decoration.inline(pmPos.from, pmPos.to, {
                    class: isActive ? "jte-search-match jte-search-match-active" : "jte-search-match",
                }));
            }
            return DecorationSet.create(state.doc, decos);
        }

        function updateMatchCount(state) {
            if (!matchCount || !searchField) return;
            const s = getSearchState();
            if (!s.search) { matchCount.textContent = "0/0"; return; }
            const matches = findMatches(state.doc, s.search, s.caseSensitive, s.wholeWord, s.regexp);
            const { from: selFrom } = state.selection;
            let current = 0;
            for (let i = 0; i < matches.length; i++) {
                const pm = textToPmPos(state.doc, matches[i].from, matches[i].to);
                if (pm && pm.from === selFrom) { current = i + 1; break; }
            }
            matchCount.textContent = matches.length ? `${current}/${matches.length}` : "0/0";
        }

        /** Trigger decoration repaint without stealing focus from the panel.
         *  We dispatch a no-op transaction (meta-only, no doc/selection change).
         *  This makes PM re-call `decorations()`. PM's selectionToDOM already
         *  guards with `editorOwnsSelection` — since focus is on the panel input,
         *  not the editor, PM won't move focus. */
        function refresh() {
            searchVersion++;
            cachedDecos = buildDecorations(ext.editor.state);
            if (editorView) {
                const focused = document.activeElement;
                editorView.dispatch(editorView.state.tr.setMeta(searchKey, { refresh: true }));
                // Belt-and-suspenders: if PM did steal focus, put it back
                if (focused && focused !== document.activeElement && panelEl?.contains(focused)) {
                    focused.focus();
                }
            }
            updateMatchCount(ext.editor.state);
        }

        function navigateMatch(editor, direction) {
            const s = getSearchState();
            if (!s.search) return;
            const state = editor.state;
            const matches = findMatches(state.doc, s.search, s.caseSensitive, s.wholeWord, s.regexp);
            if (!matches.length) return;

            const { from: selFrom } = state.selection;
            const pmMatches = matches.map(m => textToPmPos(state.doc, m.from, m.to)).filter(Boolean);
            if (!pmMatches.length) return;

            let idx;
            if (direction === "next") {
                idx = pmMatches.findIndex(m => m.from > selFrom);
                if (idx === -1) idx = 0;
            } else {
                idx = -1;
                for (let i = pmMatches.length - 1; i >= 0; i--) {
                    if (pmMatches[i].from < selFrom) { idx = i; break; }
                }
                if (idx === -1) idx = pmMatches.length - 1;
            }

            const target = pmMatches[idx];
            editor.chain().focus().setTextSelection(target).scrollIntoView().run();
        }

        function doReplace(editor) {
            const s = getSearchState();
            if (!s.search) return;
            const state = editor.state;
            const { from, to } = state.selection;
            const selected = state.doc.textBetween(from, to);
            const needle = s.caseSensitive ? s.search : s.search.toLowerCase();
            const compare = s.caseSensitive ? selected : selected.toLowerCase();
            if (compare === needle) {
                editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, s.replace).run();
            }
            navigateMatch(editor, "next");
        }

        function doReplaceAll(editor) {
            const s = getSearchState();
            if (!s.search) return;
            const state = editor.state;
            const matches = findMatches(state.doc, s.search, s.caseSensitive, s.wholeWord, s.regexp);
            if (!matches.length) return;

            const pmMatches = matches.map(m => textToPmPos(state.doc, m.from, m.to)).filter(Boolean);
            const { tr } = state;
            for (let i = pmMatches.length - 1; i >= 0; i--) {
                if (s.replace) {
                    tr.replaceWith(pmMatches[i].from, pmMatches[i].to, state.schema.text(s.replace));
                } else {
                    tr.delete(pmMatches[i].from, pmMatches[i].to);
                }
            }
            editor.view.dispatch(tr);
        }

        /** Position the panel and clamp to container bounds */
        function positionPanel(mode) {
            if (!panelEl || !containerEl) return;

            if (mode === "selection" && editorView) {
                const { from } = ext.editor.state.selection;
                const coords = editorView.coordsAtPos(from);
                const cRect = containerEl.getBoundingClientRect();
                // Measure panel width
                panelEl.style.right = "auto";
                panelEl.style.left = "0";
                const pRect = panelEl.getBoundingClientRect();
                // Position below the selection, relative to container
                let left = coords.left - cRect.left;
                let top = coords.bottom - cRect.top + 6;
                // Clamp to container bounds
                left = Math.max(4, Math.min(left, cRect.width - pRect.width - 4));
                top = Math.max(4, Math.min(top, cRect.height - pRect.height - 4));
                panelEl.style.left = left + "px";
                panelEl.style.top = top + "px";
            } else {
                // Fixed: pinned to top-right — stays put on resize
                panelEl.style.left = "auto";
                panelEl.style.right = "8px";
                panelEl.style.top = "8px";
            }
        }

        function showPanel(editor, mode = "fixed") {
            if (!panelEl) return;
            visible = true;
            panelEl.style.display = "flex";
            positionPanel(mode);
            searchField.select();
            refresh();
            ext.options.onVisibilityChange(true);
        }

        function hidePanel(editor) {
            visible = false;
            if (panelEl) panelEl.style.display = "none";
            refresh();
            ext.options.onVisibilityChange(false);
            editor.commands.focus();
        }

        function buildPanel(editor) {
            searchField = el("input", {
                placeholder: "Find",
                className: "jte-find-input",
                form: "",
                oninput: () => refresh(),
            });

            replaceField = el("input", {
                placeholder: "Replace",
                className: "jte-find-input",
                form: "",
            });

            caseBtn = toggleBtn("match_case", "Match Case", false, () => refresh());
            wordBtn = toggleBtn("match_word", "Match Whole Word", false, () => refresh());
            reBtn = toggleBtn("regular_expression", "Use Regular Expression", false, () => refresh());
            matchCount = el("span", { className: "jte-match-count" }, ["0/0"]);

            panelEl = el("div", {
                className: "jte-find",
                style: "display:none; position:absolute; z-index:50;",
                onkeydown: (e) => {
                    if (e.key === "Escape") { e.preventDefault(); hidePanel(editor); }
                    else if (e.key === "Enter" && e.target === searchField) {
                        e.preventDefault();
                        navigateMatch(editor, e.shiftKey ? "prev" : "next");
                    }
                    else if (e.key === "Enter" && e.target === replaceField) {
                        e.preventDefault();
                        doReplace(editor);
                    }
                },
            }, [
                searchField,
                iconBtn("swap_horiz", "Swap", () => {
                    const tmp = searchField.value;
                    searchField.value = replaceField.value;
                    replaceField.value = tmp;
                    refresh();
                }),
                replaceField,
                sep(),
                caseBtn, wordBtn, reBtn,
                sep(),
                iconBtn("keyboard_arrow_up", "Previous (Shift+Enter)", () => navigateMatch(editor, "prev")),
                iconBtn("keyboard_arrow_down", "Next (Enter)", () => navigateMatch(editor, "next")),
                sep(),
                iconBtn("check", "Replace", () => doReplace(editor)),
                iconBtn("done_all", "Replace All", () => doReplaceAll(editor)),
                sep(),
                matchCount,
                iconBtn("close", "Close (Esc)", () => hidePanel(editor)),
            ]);

            return panelEl;
        }

        function iconBtn(iconName, title, onclick) {
            return el("button", { className: "jte-fo", title, type: "button", onclick }, [icon(iconName)]);
        }

        function toggleBtn(iconName, title, initial, onToggle) {
            const btn = el("button", {
                className: "jte-fo" + (initial ? " on" : ""),
                title,
                type: "button",
                onclick: () => { btn.classList.toggle("on"); onToggle(); },
            }, [icon(iconName)]);
            return btn;
        }

        function sep() {
            return el("span", { className: "jte-find-sep" });
        }

        // Track version so decorations() knows when to recompute
        let lastVersion = -1;
        let cachedDecos = DecorationSet.empty;

        return [
            new Plugin({
                key: searchKey,
                props: {
                    decorations(state) {
                        // Recompute when search input changes or on any new state
                        if (searchVersion !== lastVersion) {
                            lastVersion = searchVersion;
                            cachedDecos = buildDecorations(state);
                        }
                        return cachedDecos;
                    },
                    handleKeyDown(_view, event) {
                        if (event.key === "Escape" && visible) {
                            event.preventDefault();
                            hidePanel(ext.editor);
                            return true;
                        }
                        if ((event.ctrlKey || event.metaKey) && event.key === "f") {
                            event.preventDefault();
                            const sel = ext.editor.state.selection;
                            const hasSelection = !sel.empty;
                            showPanel(ext.editor, hasSelection ? "selection" : "fixed");
                            // Pre-fill search with selected text
                            if (hasSelection && searchField) {
                                const text = ext.editor.state.doc.textBetween(sel.from, sel.to);
                                if (text) {
                                    searchField.value = text;
                                    refresh();
                                }
                            }
                            return true;
                        }
                        return false;
                    },
                },
                view(view) {
                    editorView = view;
                    const panel = buildPanel(ext.editor);
                    ext.storage.showPanel = () => showPanel(ext.editor, "fixed");
                    containerEl = view.dom.closest(".jte-rich-container");
                    if (containerEl) {
                        containerEl.style.position = "relative";
                        containerEl.appendChild(panel);
                    }
                    return {
                        update(view) {
                            // Rebuild decorations on doc/selection changes
                            cachedDecos = buildDecorations(view.state);
                            if (visible) updateMatchCount(view.state);
                        },
                        destroy() {
                            panel.remove();
                            editorView = null;
                        },
                    };
                },
            }),
        ];
    },
});
