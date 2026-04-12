<script>
    import TopBar from "./TopBar.svelte";
    import TabBar from "./TabBar.svelte";
    import CodeMirrorEditor from "./CodeMirrorEditor.svelte";
    import RichTextEditor from "./RichTextEditor.svelte";
    import { detectLineEnding, splitLines } from "./lib/characters.js";
    import { languages } from "./lib/languages.js";

    let {
        tabs: initialTabs = [],
        settings = {},
        onopen,
        onsave,
        onsaveAs,
        ontabchange,
        onsettingschange,
        onback,
        onclose,
    } = $props();

    let nextId = $state(1);
    let tabs = $state(
        initialTabs.length
            ? initialTabs.map((t) => ({ modified: false, language: "", ...t }))
            : [makeTab()],
    );
    let activeTabId = $state(initialTabs[0]?.id || tabs[0]?.id || "");
    let activeTab = $derived(tabs.find((t) => t.id === activeTabId));

    // Internal state — overridden by settings prop when present
    let _showInvisibles = $state(false);
    let _showLineNumbers = $state(true);
    let _wordWrap = $state(false);
    let _highlightLine = $state(true);
    let _theme = $state("dark");
    let _pageWidth = $state("normal");
    let _bgColor = $state("");
    let _pageCanvasColor = $state("");
    let _pageColor = $state("");

    let showInvisibles = $derived(settings.showInvisibles ?? _showInvisibles);
    let showLineNumbers = $derived(settings.showLineNumbers ?? _showLineNumbers);
    let wordWrap = $derived(settings.wordWrap ?? _wordWrap);
    let highlightLine = $derived(settings.highlightLine ?? _highlightLine);
    let theme = $derived(settings.theme ?? _theme);
    let pageWidth = $derived(settings.pageWidth ?? _pageWidth);
    let bgColor = $derived(settings.bgColor ?? _bgColor);
    let pageCanvasColor = $derived(settings.pageCanvasColor ?? _pageCanvasColor);
    let pageColor = $derived(settings.pageColor ?? _pageColor);
    let cursorLine = $state(1);
    let cursorCol = $state(1);
    let editorRef = $state();

    let lineEnding = $derived(
        activeTab ? detectLineEnding(activeTab.content) : "lf",
    );
    let totalLines = $derived(
        activeTab ? splitLines(activeTab.content).length : 0,
    );

    let isPlainMode = $derived(activeTab?.mode !== "rich");

    function makeTab(overrides = {}) {
        return {
            id: "tab-" + nextId++,
            name: "Untitled",
            content: "",
            language: "",
            mode: "rich",
            modified: false,
            path: "",
            ...overrides,
        };
    }

    function newTab() {
        const tab = makeTab();
        tabs.push(tab);
        activeTabId = tab.id;
    }

    function closeTab(id) {
        const idx = tabs.findIndex((t) => t.id === id);
        if (idx === -1) return;
        tabs.splice(idx, 1);
        if (tabs.length === 0) newTab();
        else if (activeTabId === id)
            activeTabId = tabs[Math.min(idx, tabs.length - 1)].id;
    }

    function handleChange(newContent) {
        const tab = tabs.find((t) => t.id === activeTabId);
        if (tab) {
            tab.content = newContent;
            tab.modified = true;
        }
    }

    function handleCursor({ line, col }) {
        cursorLine = line;
        cursorCol = col;
    }

    function notifySettings() {
        onsettingschange?.({ showInvisibles, showLineNumbers, wordWrap, highlightLine, theme, pageWidth, bgColor, pageCanvasColor, pageColor });
    }

    function handleAction(action) {
        switch (action) {
            case "file.new":
                newTab();
                break;
            case "file.open":
                onopen?.();
                break;
            case "file.save":
                onsave?.(activeTab);
                break;
            case "file.saveAs":
                onsaveAs?.(activeTab);
                break;
            case "file.closeTab":
                closeTab(activeTabId);
                break;
            case "edit.find":
            case "edit.toggleFind":
                editorRef?.focusSearch();
                break;
            case "view.wordWrap":
                _wordWrap = !_wordWrap;
                notifySettings();
                break;
            case "view.lineNumbers":
                _showLineNumbers = !_showLineNumbers;
                notifySettings();
                break;
            case "view.highlightLine":
                _highlightLine = !_highlightLine;
                notifySettings();
                break;
            case "view.invisibles":
                _showInvisibles = !_showInvisibles;
                notifySettings();
                break;
            case "view.toggleMode": {
                const tab = tabs.find((t) => t.id === activeTabId);
                if (tab) tab.mode = tab.mode === "rich" ? "plain" : "rich";
                break;
            }
            case "view.theme":
                _theme = _theme === "dark" ? "light" : "dark";
                notifySettings();
                break;
            case "view.pageWidth.full":
            case "view.pageWidth.wide":
            case "view.pageWidth.normal":
            case "view.pageWidth.narrow":
                _pageWidth = action.split(".").pop();
                notifySettings();
                break;
            default:
                if (action.startsWith("view.bgColor:")) {
                    _bgColor = action.split(":")[1];
                    notifySettings();
                } else if (action.startsWith("view.pageCanvasColor:")) {
                    _pageCanvasColor = action.split(":")[1];
                    notifySettings();
                } else if (action.startsWith("view.pageColor:")) {
                    _pageColor = action.split(":")[1];
                    notifySettings();
                }
                break;
        }
    }

    function handleKeydown(e) {
        const mod = e.ctrlKey || e.metaKey;
        if (mod && e.key === "s") {
            e.preventDefault();
            e.shiftKey ? onsaveAs?.(activeTab) : onsave?.(activeTab);
        }
        if (mod && e.key === "n") {
            e.preventDefault();
            newTab();
        }
        if (mod && e.key === "w") {
            e.preventDefault();
            closeTab(activeTabId);
        }
        if (mod && e.shiftKey && e.key === "I") {
            e.preventDefault();
            _showInvisibles = !_showInvisibles;
            notifySettings();
        }
        if (e.altKey && e.key === "z") {
            e.preventDefault();
            _wordWrap = !_wordWrap;
            notifySettings();
        }
        if (mod && e.key === "o") {
            e.preventDefault();
            onopen?.();
        }
    }

    export function openFile({ name, content, language = "", path = "" }) {
        const tab = makeTab({ name, content, language, path });
        tabs.push(tab);
        activeTabId = tab.id;
    }

    export function markSaved(path) {
        const tab = tabs.find((t) => t.id === activeTabId);
        if (tab) {
            tab.modified = false;
            if (path) {
                tab.path = path;
                tab.name = path.split(/[\\/]/).pop();
            }
        }
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="jte-root" data-theme={theme} onkeydown={handleKeydown}
    style:--jte-bg={(isPlainMode ? bgColor : (pageWidth === 'full' ? pageColor : null)) || null}
    style:--jte-page-canvas={pageCanvasColor || null}
    style:--jte-page-color={(!isPlainMode && pageWidth !== 'full' ? pageColor : null) || null}>
    {#if activeTab}
        <TopBar
            name={activeTab.name}
            path={activeTab.path}
            modified={activeTab.modified}
            {showLineNumbers}
            {wordWrap}
            {showInvisibles}
            {highlightLine}
            {isPlainMode}
            {theme}
            {pageWidth}
            {bgColor}
            {pageCanvasColor}
            {pageColor}
            onaction={handleAction}
            onback={() => onback?.()}
            onclose={() => onclose?.()}
        />

        <div class="jte-editor-wrap">
            {#if isPlainMode}
                <CodeMirrorEditor
                    bind:this={editorRef}
                    content={activeTab.content}
                    language={activeTab.language}
                    {showInvisibles}
                    {showLineNumbers}
                    {wordWrap}
                    {highlightLine}
                    onchange={handleChange}
                    oncursor={handleCursor}
                />
            {:else}
                <RichTextEditor
                    bind:this={editorRef}
                    content={activeTab.content}
                    onchange={handleChange}
                    {pageWidth}
                    {wordWrap}
                />
            {/if}
        </div>

        <div class="jte-bottom">
            <div class="jte-bottom-left">
                <TabBar
                    {tabs}
                    {activeTabId}
                    onselect={(id) => {
                        activeTabId = id;
                        ontabchange?.(tabs.find((t) => t.id === id));
                    }}
                    onclose={closeTab}
                    onnewTab={newTab}
                />
            </div>
            <div class="jte-bottom-right">
                {#if isPlainMode}
                    <select
                        class="jte-lang-select"
                        value={activeTab.language}
                        onchange={(e) => {
                            const tab = tabs.find((t) => t.id === activeTabId);
                            if (tab) tab.language = e.target.value;
                        }}
                    >
                        {#each languages as [val, label]}
                            <option value={val}>{label}</option>
                        {/each}
                    </select>
                    <span class="jte-status">Ln {cursorLine}, Col {cursorCol}</span>
                    <span class="jte-status">{totalLines} lines</span>
                    <span class="jte-status">{lineEnding.toUpperCase()}</span>
                {:else}
                    <span class="jte-status">Rich Text</span>
                {/if}
                <button
                    class="jte-theme-btn"
                    title={theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
                    onclick={() => handleAction('view.theme')}
                >
                    <span class="material-symbols-outlined">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
                </button>
            </div>
        </div>
    {/if}
</div>

<style>
    .jte-root {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        background: var(--jte-bg, #1e1e1e);
        color: var(--jte-fg, #d4d4d4);
        overflow: hidden;
    }

    /* Light theme overrides */
    .jte-root[data-theme="light"] {
        --jte-bg: #ffffff;
        --jte-fg: #1e1e1e;
        --jte-border: #d4d4d4;
        --jte-accent: #0066cc;
        --jte-menubar-bg: #f3f3f3;
        --jte-toolbar-bg: #f3f3f3;
        --jte-toolbar-fg: #555;
        --jte-toolbar-hover: #e0e0e0;
        --jte-status-fg: #777;
        --jte-gutter-fg: #999;
        --jte-selection: rgba(0, 120, 215, 0.35);
        --jte-selection-focused: rgba(0, 120, 215, 0.5);
        --jte-active-line: rgba(0, 0, 0, 0.04);
        --jte-input-focus-bg: #ffffff;
        --jte-search-match: rgba(255, 200, 0, 0.4);
        --jte-search-match-active: rgba(255, 150, 0, 0.6);
        --jte-bracket-match-bg: rgba(0, 0, 0, 0.07);
        --jte-bracket-match-border: rgba(0, 0, 0, 0.2);
        --jte-scrollbar-thumb: rgba(0, 0, 0, 0.2);
        --jte-scrollbar-thumb-hover: rgba(0, 0, 0, 0.35);
        --jte-page-canvas: #e8e8e8;

        /* Syntax highlighting — light palette */
        --jte-syntax-comment: #008000;
        --jte-syntax-punctuation: #af00db;
        --jte-syntax-property: #098658;
        --jte-syntax-string: #a31515;
        --jte-syntax-operator: #1e1e1e;
        --jte-syntax-keyword: #0000ff;
        --jte-syntax-function: #795e26;
        --jte-syntax-variable: #811f3f;
        --jte-syntax-meta: #0000ff;
    }

    /* Native text selection — consistent across inputs, TipTap, etc. */
    .jte-root :global(::selection) {
        background: var(--jte-selection-focused, rgba(38, 119, 204, 0.35));
    }

    .jte-editor-wrap {
        flex: 1;
        position: relative;
        overflow: hidden;
        display: flex;
    }

    .jte-bottom {
        display: flex;
        align-items: top;
        justify-content: space-between;
        padding: 0px 8px 0px 0px;
        background: var(--jte-toolbar-bg, #1e1e1e);
        border-top: 1px solid var(--jte-border, #333);
        flex-shrink: 0;
        height: 24px;
        gap: 0px;
    }

    .jte-bottom-left {
        flex: 1;
        overflow: hidden;
    }

    .jte-bottom-right {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
    }

    .jte-status {
        color: var(--jte-status-fg, #888);
        font-family: var(--jte-ui-font, system-ui, -apple-system, sans-serif);
        font-size: 11px;
        white-space: nowrap;
    }

    .jte-lang-select {
        background: transparent;
        border: none;
        color: var(--jte-status-fg, #888);
        font-family: var(--jte-ui-font, system-ui, sans-serif);
        font-size: 11px;
        cursor: pointer;
        outline: none;
        scrollbar-width: none;
    }

    .jte-lang-select::-webkit-scrollbar {
        display: none;
    }

    .jte-lang-select:hover {
        color: var(--jte-toolbar-fg, #ccc);
    }

    .jte-lang-select option {
        color: var(--jte-toolbar-fg, #ccc);
    }

    .jte-theme-btn {
        display: flex;
        align-items: center;
        background: transparent;
        border: none;
        color: var(--jte-status-fg, #888);
        padding: 2px 4px;
        cursor: pointer;
        line-height: 1;
        border-radius: 3px;
    }

    .jte-theme-btn:hover {
        color: var(--jte-toolbar-fg, #ccc);
    }

    .jte-theme-btn .material-symbols-outlined {
        font-size: 14px;
    }
</style>
