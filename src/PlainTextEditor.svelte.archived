<script>
    import Prism from "prismjs";

    import "prismjs/components/prism-c";
    import "prismjs/components/prism-cpp";
    import "prismjs/components/prism-csharp";
    import "prismjs/components/prism-java";
    import "prismjs/components/prism-python";
    import "prismjs/components/prism-rust";
    import "prismjs/components/prism-go";
    import "prismjs/components/prism-typescript";
    import "prismjs/components/prism-bash";
    import "prismjs/components/prism-sql";
    import "prismjs/components/prism-json";
    import "prismjs/components/prism-yaml";
    import "prismjs/components/prism-markdown";
    import "prismjs/components/prism-markup-templating";
    import "prismjs/components/prism-php";
    import "prismjs/components/prism-ruby";
    import "prismjs/components/prism-swift";
    import "prismjs/components/prism-kotlin";
    import "prismjs/components/prism-lua";
    import "prismjs/components/prism-perl";
    import "prismjs/components/prism-r";
    import "prismjs/components/prism-scala";
    import "prismjs/components/prism-dart";
    import "prismjs/components/prism-powershell";
    import "prismjs/components/prism-toml";
    import "prismjs/components/prism-diff";
    import "prismjs/components/prism-docker";
    import "prismjs/components/prism-ini";
    import "prismjs/components/prism-regex";

    let {
        content = "",
        language = "",
        showInvisibles = false,
        showLineNumbers = true,
        wordWrap = false,
        highlightLine = true,
        findAction = null,
        onchange,
        oncursor,
        onmatchchange,
    } = $props();

    let textarea = $state();
    let overlay = $state();
    let gutterEl = $state();
    let searchTerm = $state("");
    let currentMatchIdx = $state(-1);
    let currentLine = $state(1);

    const LANG_MAP = {
        js: "javascript",
        ts: "typescript",
        jsx: "javascript",
        tsx: "typescript",
        html: "markup",
        htm: "markup",
        xml: "markup",
        svg: "markup",
        css: "css",
        json: "json",
        py: "python",
        rs: "rust",
        md: "markdown",
        sh: "bash",
        bash: "bash",
        yml: "yaml",
        yaml: "yaml",
        c: "c",
        cpp: "cpp",
        h: "c",
        hpp: "cpp",
        cs: "csharp",
        java: "java",
        go: "go",
        rb: "ruby",
        php: "php",
        swift: "swift",
        kt: "kotlin",
        lua: "lua",
        pl: "perl",
        r: "r",
        scala: "scala",
        dart: "dart",
        ps1: "powershell",
        toml: "toml",
        sql: "sql",
        dockerfile: "docker",
        ini: "ini",
        cfg: "ini",
        diff: "diff",
    };

    function getPrismLang(lang) {
        const key = LANG_MAP[lang] || lang;
        return Prism.languages[key] ? key : null;
    }

    function syntaxHighlight(text, lang) {
        const prismLang = getPrismLang(lang);
        if (!prismLang) return escapeHtml(text);
        return Prism.highlight(text, Prism.languages[prismLang], prismLang);
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function addMatchHighlights(html, term, activeCharIdx) {
        if (!term) return html;
        const matches = findAllMatches(term);
        if (!matches.length) return html;

        // Build HTML from raw content with match spans inserted
        let result = "";
        let pos = 0;
        for (const m of matches) {
            result += escapeHtml(content.slice(pos, m.idx));
            const cls =
                m.idx === activeCharIdx
                    ? "jte-match jte-match-active"
                    : "jte-match";
            result += `<span class="${cls}">${escapeHtml(content.slice(m.idx, m.idx + m.len))}</span>`;
            pos = m.idx + m.len;
        }
        result += escapeHtml(content.slice(pos));
        return result;
    }

    function handleInput(e) {
        content = e.target.value;
        onchange?.(content);
    }

    function handleKeydown(e) {
        if (e.key === "Tab") {
            e.preventDefault();
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const val = textarea.value;
            textarea.value = val.slice(0, start) + "\t" + val.slice(end);
            textarea.selectionStart = textarea.selectionEnd = start + 1;
            content = textarea.value;
            onchange?.(content);
        }
        // Update cursor on keydown for instant line highlight
        setTimeout(handleCursor, 0);
    }

    function handleCursor() {
        if (!textarea) return;
        const pos = textarea.selectionStart;
        const before = textarea.value.slice(0, pos);
        const lines = before.split("\n");
        currentLine = lines.length;
        oncursor?.({
            line: lines.length,
            col: lines[lines.length - 1].length + 1,
        });
    }

    function syncScroll() {
        if (overlay && textarea) {
            overlay.scrollTop = textarea.scrollTop;
            overlay.scrollLeft = textarea.scrollLeft;
        }
        if (gutterEl && textarea) {
            gutterEl.scrollTop = textarea.scrollTop;
        }
    }

    // ── Find/replace ──
    let findOpts = { matchCase: false, wholeWord: false, useRegex: false };

    function buildFindRegex(term) {
        if (!term) return null;
        let pattern = findOpts.useRegex
            ? term
            : term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (findOpts.wholeWord) pattern = `\\b${pattern}\\b`;
        const flags = findOpts.matchCase ? "g" : "gi";
        try {
            return new RegExp(pattern, flags);
        } catch {
            return null;
        }
    }

    function findAllMatches(term) {
        const re = buildFindRegex(term);
        if (!re) return [];
        const matches = [];
        let m;
        while ((m = re.exec(content)) !== null) {
            matches.push({ idx: m.index, len: m[0].length });
            if (!m[0].length) re.lastIndex++; // prevent infinite loop on zero-width
        }
        return matches;
    }

    function doFindNext(term) {
        if (!textarea || !term) return;
        searchTerm = term;
        const matches = findAllMatches(term);
        if (!matches.length) {
            currentMatchIdx = -1;
            return;
        }
        const after = textarea.selectionEnd;
        const match = matches.find((m) => m.idx >= after) || matches[0];
        currentMatchIdx = match.idx;
        textarea.selectionStart = match.idx;
        textarea.selectionEnd = match.idx + match.len;
        scrollToMatch(match.idx);
    }

    function doFindPrev(term) {
        if (!textarea || !term) return;
        searchTerm = term;
        const matches = findAllMatches(term);
        if (!matches.length) {
            currentMatchIdx = -1;
            return;
        }
        const before = textarea.selectionStart;
        let match;
        for (let i = matches.length - 1; i >= 0; i--) {
            if (matches[i].idx < before) {
                match = matches[i];
                break;
            }
        }
        if (!match) match = matches[matches.length - 1];
        currentMatchIdx = match.idx;
        textarea.selectionStart = match.idx;
        textarea.selectionEnd = match.idx + match.len;
        scrollToMatch(match.idx);
    }

    function scrollToMatch(charIdx) {
        if (!textarea) return;
        const lineNum = content.slice(0, charIdx).split("\n").length - 1;
        const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight);
        textarea.scrollTop = Math.max(
            0,
            lineNum * lineHeight - textarea.clientHeight / 2,
        );
        syncScroll();
    }

    function doReplace(search, replace) {
        if (!textarea || !search || currentMatchIdx === -1) return;
        const matches = findAllMatches(search);
        const match = matches.find((m) => m.idx === currentMatchIdx);
        if (!match) return;
        const before = content.slice(0, match.idx);
        const after = content.slice(match.idx + match.len);
        const replacement = findOpts.useRegex
            ? content
                  .slice(match.idx, match.idx + match.len)
                  .replace(buildFindRegex(search), replace)
            : replace;
        textarea.value = before + replacement + after;
        content = textarea.value;
        onchange?.(content);
        textarea.selectionStart = textarea.selectionEnd =
            match.idx + replacement.length;
        doFindNext(search);
    }

    function doReplaceAll(search, replace) {
        if (!textarea || !search) return;
        const re = buildFindRegex(search);
        if (!re) return;
        textarea.value = content.replace(re, replace);
        content = textarea.value;
        onchange?.(content);
        searchTerm = search;
        currentMatchIdx = -1;
    }

    let lastFindTick = $state(0);

    $effect(() => {
        if (!findAction || !textarea) return;
        const { type, search, replace, _tick, matchCase, wholeWord, useRegex } =
            findAction;
        if (_tick === lastFindTick) return;
        lastFindTick = _tick;
        findOpts = {
            matchCase: !!matchCase,
            wholeWord: !!wholeWord,
            useRegex: !!useRegex,
        };
        switch (type) {
            case "next":
                doFindNext(search);
                break;
            case "prev":
                doFindPrev(search);
                break;
            case "replace":
                doReplace(search, replace);
                break;
            case "replaceAll":
                doReplaceAll(search, replace);
                break;
            case "clear":
                searchTerm = "";
                currentMatchIdx = -1;
                break;
        }
    });

    $effect(() => {
        onmatchchange?.(currentMatchIdx);
    });

    // Always show overlay when we have language highlighting, active search, or line highlight
    let showOverlay = $derived(!!language || !!searchTerm || highlightLine);

    let highlightedHtml = $derived.by(() => {
        let html = language
            ? syntaxHighlight(content, language)
            : escapeHtml(content);
        if (searchTerm) {
            html = addMatchHighlights(html, searchTerm, currentMatchIdx);
        }
        // Add line highlight by wrapping the current line
        if (highlightLine && currentLine > 0) {
            const lines = html.split("\n");
            const idx = currentLine - 1;
            if (idx < lines.length) {
                // Use \n as content for empty lines so the span doesn't collapse
                const lineContent = lines[idx] || " ";
                lines[idx] =
                    `<span class="jte-current-line">${lineContent}</span>`;
            }
            html = lines.join("\n");
        }
        return html;
    });

    let lineCount = $derived(content.split("\n").length);
    let gutterWidth = $derived(Math.max(String(lineCount).length, 2));
</script>

<div class="jte-plain" class:word-wrap={wordWrap}>
    {#if showLineNumbers}
        <div
            bind:this={gutterEl}
            class="jte-gutter"
            aria-hidden="true"
            style="width: {gutterWidth + 2}ch"
        >
            {#each Array(lineCount) as _, i}
                <div
                    class="jte-line-num"
                    class:active={highlightLine && i + 1 === currentLine}
                >
                    {i + 1}
                </div>
            {/each}
        </div>
    {/if}

    <div class="jte-editor-area">
        <textarea
            bind:this={textarea}
            value={content}
            oninput={handleInput}
            onmousedown={() => setTimeout(handleCursor, 0)}
            onkeydown={handleKeydown}
            onkeyup={handleCursor}
            onscroll={syncScroll}
            class="jte-textarea"
            class:has-overlay={showOverlay}
            spellcheck="false"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
        ></textarea>

        {#if showOverlay}
            <pre
                bind:this={overlay}
                class="jte-overlay"
                aria-hidden="true">{@html highlightedHtml + "\n"}</pre>
        {/if}
    </div>
</div>

<style>
    .jte-plain {
        flex: 1;
        overflow: hidden;
        display: flex;
        position: relative;
    }

    .jte-gutter {
        padding: 8px 8px;
        background: var(--jte-bg, #1e1e1e);
        border-right: 1px solid var(--jte-border, #333);
        overflow: hidden;
        flex-shrink: 0;
        text-align: right;
    }

    .jte-line-num {
        padding: 0 8px 0 12px;
        color: var(--jte-gutter-fg, #555);
        font-family: var(
            --jte-font,
            "Cascadia Code",
            "Fira Code",
            "Consolas",
            monospace
        );
        font-size: var(--jte-font-size, 14px);
        line-height: var(--jte-line-height, 1.5);
        height: calc(var(--jte-font-size, 14px) * var(--jte-line-height, 1.5));
    }

    .jte-line-num.active {
        color: var(--jte-fg, #d4d4d4);
    }

    .jte-editor-area {
        flex: 1;
        position: relative;
        overflow: hidden;
    }

    .jte-textarea,
    .jte-overlay {
        position: absolute;
        inset: 0;
        margin: 0;
        padding: 8px 12px;
        border: none;
        font-family: var(
            --jte-font,
            "Cascadia Code",
            "Fira Code",
            "Consolas",
            monospace
        );
        font-size: var(--jte-font-size, 14px);
        line-height: var(--jte-line-height, 1.5);
        tab-size: var(--jte-tab-size, 4);
        white-space: pre;
        word-wrap: normal;
    }

    .word-wrap .jte-textarea,
    .word-wrap .jte-overlay {
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow-x: hidden;
    }

    .jte-textarea {
        background: var(--jte-bg, #1e1e1e);
        color: var(--jte-fg, #d4d4d4);
        outline: none;
        resize: none;
        z-index: 0;
        overflow: auto;
    }

    .jte-textarea::-webkit-scrollbar {
        width: 20px;
        height: 20px;
    }
    .jte-textarea::-webkit-scrollbar-track {
        background: transparent;
    }
    .jte-textarea::-webkit-scrollbar-thumb {
        border: 6px solid transparent;
        background-clip: padding-box;
        border-radius: 10px;
        background-color: rgba(255, 255, 255, 0.2);
    }
    .jte-textarea::-webkit-scrollbar-thumb:hover {
        background-color: rgba(255, 255, 255, 0.35);
    }
    .jte-textarea::-webkit-scrollbar-corner {
        background: transparent;
    }

    .jte-textarea.has-overlay {
        color: transparent;
        caret-color: var(--jte-fg, #d4d4d4);
    }

    .jte-overlay {
        pointer-events: none;
        z-index: 1;
        background: transparent;
        color: var(--jte-fg, #d4d4d4);
        overflow: hidden;
    }

    /* Current line highlight */
    .jte-overlay :global(.jte-current-line) {
        display: inline-block;
        min-width: calc(100% + 24px);
        background: rgba(255, 255, 255, 0.04);
        margin: 0 -12px;
        padding: 0 12px;
        box-decoration-break: clone;
    }

    /* Find match highlights */
    .jte-overlay :global(.jte-match) {
        background: rgba(255, 200, 0, 0.25);
        border-radius: 2px;
        color: inherit;
    }

    .jte-overlay :global(.jte-match-active) {
        background: rgba(255, 200, 0, 0.6);
        outline: 1px solid rgba(255, 200, 0, 0.8);
    }

    /* Prism token colors */
    .jte-overlay :global(.token.comment),
    .jte-overlay :global(.token.prolog),
    .jte-overlay :global(.token.doctype),
    .jte-overlay :global(.token.cdata) {
        color: #6a9955;
    }
    .jte-overlay :global(.token.punctuation) {
        color: #ff66bb;
    }
    .jte-overlay :global(.token.property),
    .jte-overlay :global(.token.tag),
    .jte-overlay :global(.token.boolean),
    .jte-overlay :global(.token.number),
    .jte-overlay :global(.token.constant),
    .jte-overlay :global(.token.symbol) {
        color: #b5cea8;
    }
    .jte-overlay :global(.token.selector),
    .jte-overlay :global(.token.attr-name),
    .jte-overlay :global(.token.string),
    .jte-overlay :global(.token.char),
    .jte-overlay :global(.token.builtin) {
        color: #ce9178;
    }
    .jte-overlay :global(.token.operator),
    .jte-overlay :global(.token.entity),
    .jte-overlay :global(.token.url) {
        color: #d4d4d4;
    }
    .jte-overlay :global(.token.atrule),
    .jte-overlay :global(.token.attr-value),
    .jte-overlay :global(.token.keyword) {
        color: #569cd6;
    }
    .jte-overlay :global(.token.function),
    .jte-overlay :global(.token.class-name) {
        color: #decc88;
    }
    .jte-overlay :global(.token.regex),
    .jte-overlay :global(.token.important),
    .jte-overlay :global(.token.variable) {
        color: #d16969;
    }
</style>
