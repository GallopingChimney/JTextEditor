import { SearchQuery, setSearchQuery, findNext, findPrevious, replaceNext, replaceAll, closeSearchPanel, getSearchQuery } from "@codemirror/search";
import { EditorSelection } from "@codemirror/state";

/**
 * Custom CM6 search panel matching JTextEditor's FindBar design.
 * Floating, single-line, icon-only buttons, top-right corner.
 * Uses CM's native search logic under the hood.
 */
export function createJteSearchPanel(view) {
    return new JteSearchPanel(view);
}

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

class JteSearchPanel {
    constructor(view) {
        this.view = view;
        const query = getSearchQuery(view.state);

        this.searchField = el("input", {
            value: query.search || "",
            placeholder: "Find",
            className: "jte-find-input",
            name: "search",
            form: "",
            "main-field": "true",
            oninput: () => {
                this.commit();
                this.selectFirstMatch();
            },
        });

        this.replaceField = el("input", {
            value: query.replace || "",
            placeholder: "Replace",
            className: "jte-find-input",
            name: "replace",
            form: "",
            oninput: () => this.commit(),
        });

        this.caseBtn = this.toggleBtn("match_case", "Match Case", query.caseSensitive);
        this.wordBtn = this.toggleBtn("match_word", "Match Whole Word", query.wholeWord);
        this.reBtn = this.toggleBtn("regular_expression", "Use Regular Expression", query.regexp);

        this.matchCount = el("span", { className: "jte-match-count" }, ["0/0"]);

        this.dom = el("div", {
            className: "jte-find",
            onkeydown: (e) => this.keydown(e),
        }, [
            this.searchField,
            this.iconBtn("swap_horiz", "Swap", () => this.swap()),
            this.replaceField,
            this.sep(),
            this.caseBtn,
            this.wordBtn,
            this.reBtn,
            this.sep(),
            this.iconBtn("keyboard_arrow_up", "Previous (Shift+Enter)", () => findPrevious(view)),
            this.iconBtn("keyboard_arrow_down", "Next (Enter)", () => findNext(view)),
            this.sep(),
            this.iconBtn("check", "Replace", () => replaceNext(view)),
            this.iconBtn("done_all", "Replace All", () => replaceAll(view)),
            this.sep(),
            this.matchCount,
            this.iconBtn("close", "Close (Esc)", () => closeSearchPanel(view)),
        ]);
    }

    iconBtn(iconName, title, onclick) {
        return el("button", {
            className: "jte-fo",
            title,
            onclick,
            type: "button",
        }, [icon(iconName)]);
    }

    toggleBtn(iconName, title, initialState) {
        const btn = el("button", {
            className: "jte-fo" + (initialState ? " on" : ""),
            title,
            type: "button",
            onclick: () => {
                btn.classList.toggle("on");
                this.commit();
                findNext(this.view);
            },
        }, [icon(iconName)]);
        return btn;
    }

    sep() {
        return el("span", { className: "jte-find-sep" });
    }

    /** Move editor selection to the nearest match without stealing focus */
    selectFirstMatch() {
        const query = getSearchQuery(this.view.state);
        if (!query.valid) return;
        const { from } = this.view.state.selection.main;
        const iter = query.getCursor(this.view.state.doc, from);
        iter.next();
        if (iter.done) {
            // Wrap around — try from start
            const wrap = query.getCursor(this.view.state.doc);
            wrap.next();
            if (wrap.done) return;
            this.view.dispatch({
                selection: EditorSelection.single(wrap.value.from, wrap.value.to),
                scrollIntoView: true,
            });
        } else {
            this.view.dispatch({
                selection: EditorSelection.single(iter.value.from, iter.value.to),
                scrollIntoView: true,
            });
        }
    }

    swap() {
        const s = this.searchField.value;
        this.searchField.value = this.replaceField.value;
        this.replaceField.value = s;
        this.commit();
    }

    commit() {
        const query = new SearchQuery({
            search: this.searchField.value,
            caseSensitive: this.caseBtn.classList.contains("on"),
            regexp: this.reBtn.classList.contains("on"),
            wholeWord: this.wordBtn.classList.contains("on"),
            replace: this.replaceField.value,
        });
        this.view.dispatch({ effects: setSearchQuery.of(query) });
    }

    keydown(e) {
        if (e.key === "Escape") {
            e.preventDefault();
            closeSearchPanel(this.view);
        } else if (e.key === "Enter" && e.target === this.searchField) {
            e.preventDefault();
            (e.shiftKey ? findPrevious : findNext)(this.view);
        } else if (e.key === "Enter" && e.target === this.replaceField) {
            e.preventDefault();
            replaceNext(this.view);
        }
    }

    updateMatchCount() {
        const state = this.view.state;
        const query = getSearchQuery(state);
        if (!query.valid || !this.searchField.value) {
            this.matchCount.textContent = "0/0";
            return;
        }

        const iter = query.getCursor(state.doc);
        let total = 0;
        let current = 0;
        const selFrom = state.selection.main.from;

        iter.next();
        while (!iter.done) {
            total++;
            if (iter.value.from === selFrom && !current) {
                current = total;
            }
            iter.next();
        }

        this.matchCount.textContent = total ? `${current}/${total}` : "0/0";
    }

    update(update) {
        const query = getSearchQuery(update.state);
        if (query.search !== this.searchField.value) {
            this.searchField.value = query.search;
        }
        if (query.replace !== this.replaceField.value) {
            this.replaceField.value = query.replace;
        }
        this.caseBtn.classList.toggle("on", query.caseSensitive);
        this.reBtn.classList.toggle("on", query.regexp);
        this.wordBtn.classList.toggle("on", query.wholeWord);

        if (update.docChanged || update.selectionSet || update.transactions.some(
            tr => tr.effects.some(e => e.is(setSearchQuery))
        )) {
            this.updateMatchCount();
        }
    }

    mount() {
        this.searchField.select();
        this.updateMatchCount();
    }

    get pos() { return 80; }
    get top() { return true; }
}
