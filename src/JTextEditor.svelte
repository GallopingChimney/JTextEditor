<script>
    import { untrack } from "svelte";
    import TopBar from "./TopBar.svelte";
    import TabBar from "./TabBar.svelte";
    import CodeMirrorEditor from "./CodeMirrorEditor.svelte";
    import RichTextEditor from "./RichTextEditor.svelte";
    import Settings from "./Settings.svelte";
    import TreeView from "./tree/TreeView.svelte";
    import { detectLineEnding, splitLines } from "./lib/characters.js";
    import { languages } from "./lib/languages.js";
    import { detectIndent } from "./lib/cm-setup.js";

    let {
        tabs: initialTabs = [],
        settings = {},
        ai = null,
        mode = 'sidecar',
        onopen = undefined,
        onsave = undefined,
        onsaveAs = undefined,
        ontabchange = undefined,
        onsettingschange = undefined,
        onsettings = undefined,
        onback = undefined,
        onclose = undefined,
        onminimize = undefined,
        onmaximize = undefined,
        onrename = undefined,
        onlaunch = undefined,
        onmodified = undefined,
        ontabclose = undefined,
        tree = undefined,
        onfileopen = undefined,
        onrequestdelete = undefined,
    } = $props();

    let nextId = $state(1);
    let tabs = $state(
        initialTabs.length
            ? initialTabs.map((t) => ({ modified: false, language: "", ...t }))
            : [makeTab()],
    );
    let activeTabId = $state(initialTabs[0]?.id || tabs[0]?.id || "");
    let activeTab = $derived(tabs.find((t) => t.id === activeTabId));

    // Internal state — synced from settings prop when present
    let _showInvisibles = $state(false);
    let _showLineNumbers = $state(true);
    let _wordWrap = $state(false);
    let _highlightLine = $state(true);
    let _showIndentGuides = $state(true);
    let _theme = $state("dark");
    let _pageWidth = $state("normal");
    let _bgColor = $state("");
    let _pageColor = $state("");
    let _fontFamily = $state("");
    let _fontSize = $state("");
    let _tabSize = $state(4);
    let _lineHeight = $state("");
    let _defaultMode = $state("rich");
    let _toolbarMode = $state("pinned");

    // Sync internal state from external settings prop
    $effect(() => {
        if (settings.showInvisibles != null) _showInvisibles = settings.showInvisibles;
        if (settings.showLineNumbers != null) _showLineNumbers = settings.showLineNumbers;
        if (settings.wordWrap != null) _wordWrap = settings.wordWrap;
        if (settings.highlightLine != null) _highlightLine = settings.highlightLine;
        if (settings.showIndentGuides != null) _showIndentGuides = settings.showIndentGuides;
        if (settings.theme != null) _theme = settings.theme;
        if (settings.pageWidth != null) _pageWidth = settings.pageWidth;
        if (settings.bgColor != null) _bgColor = settings.bgColor;
        if (settings.pageColor != null) _pageColor = settings.pageColor;
        if (settings.fontFamily != null) _fontFamily = settings.fontFamily;
        if (settings.fontSize != null) _fontSize = settings.fontSize;
        if (settings.tabSize != null) _tabSize = settings.tabSize;
        if (settings.lineHeight != null) _lineHeight = settings.lineHeight;
        if (settings.defaultMode != null) _defaultMode = settings.defaultMode;
        if (settings.toolbarMode != null) _toolbarMode = settings.toolbarMode;
    });

    // Derived values for reactivity in template
    let showInvisibles = $derived(_showInvisibles);
    let showLineNumbers = $derived(_showLineNumbers);
    let wordWrap = $derived(_wordWrap);
    let highlightLine = $derived(_highlightLine);
    let showIndentGuides = $derived(_showIndentGuides);
    let theme = $derived(_theme);
    let pageWidth = $derived(_pageWidth);
    let bgColor = $derived(_bgColor);
    let pageColor = $derived(_pageColor);
    let fontFamily = $derived(_fontFamily);
    let fontSize = $derived(_fontSize);
    let tabSize = $derived(_tabSize);
    let lineHeight = $derived(_lineHeight);
    let defaultMode = $derived(_defaultMode);
    let toolbarMode = $derived(_toolbarMode);
    let cursorLine = $state(1);
    let cursorCol = $state(1);
    let indentLabel = $state("Spaces: 4");
    $effect(() => {
        // Re-detect only when the active tab changes, not on every keystroke
        const _id = activeTabId; // tracked — re-runs on tab switch
        const c = untrack(() => tabs.find(t => t.id === _id)?.content);
        if (!c) { indentLabel = "Spaces: 4"; return; }
        const d = detectIndent(c);
        indentLabel = d.unit === "\t" ? `Tab Size: ${d.tabSize}` : `Spaces: ${d.unit.length}`;
    });
    let editorRef = $state();
    let settingsOpen = $state(false);
    let treeOpen = $state(true);



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
            mode: defaultMode || "rich",
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
        const removed = tabs[idx];
        ontabclose?.(removed);
        tabs.splice(idx, 1);
        if (tabs.length === 0) newTab();
        else if (activeTabId === id)
            activeTabId = tabs[Math.min(idx, tabs.length - 1)].id;
    }

    function handleChange(newContent) {
        const tab = tabs.find((t) => t.id === activeTabId);
        if (tab) {
            const wasModified = tab.modified;
            tab.content = newContent;
            tab.modified = true;
            if (!wasModified) onmodified?.(tab, true);
        }
    }

    function handleCursor({ line, col }) {
        cursorLine = line;
        cursorCol = col;
    }

    function notifySettings() {
        onsettingschange?.({ showInvisibles, showLineNumbers, wordWrap, highlightLine, showIndentGuides, theme, pageWidth, bgColor, pageColor, fontFamily, fontSize, tabSize, lineHeight, defaultMode, toolbarMode });
    }

    function handleRename(newName) {
        const tab = tabs.find((t) => t.id === activeTabId);
        if (tab) {
            tab.name = newName;
            const ext = newName.includes('.') ? newName.split('.').pop() : '';
            if (ext) tab.language = ext;
            onrename?.(tab, newName);
        }
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
            case "file.settings":
                settingsOpen = !settingsOpen;
                onsettings?.();
                break;
            case "edit.find":
                editorRef?.focusSearch();
                break;
            case "edit.toggleFind":
                editorRef?.toggleSearch();
                break;
            case "edit.copyAll":
                navigator.clipboard.writeText(activeTab.content);
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
            case "view.indentGuides":
                _showIndentGuides = !_showIndentGuides;
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
        if (mod && e.key === "k" && ai) {
            e.preventDefault();
            editorRef?.openAiPrompt?.();
        }
        if (mod && e.key === ",") {
            e.preventDefault();
            settingsOpen = !settingsOpen;
            onsettings?.();
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
            const wasModified = tab.modified;
            tab.modified = false;
            if (path) {
                tab.path = path;
                tab.name = path.split(/[\\/]/).pop();
            }
            if (wasModified) onmodified?.(tab, false);
        }
    }

    export function getActiveTab() {
        return activeTab ? { ...activeTab } : null;
    }

    export function removeTab(id) {
        closeTab(id);
    }

    export function openSettings() {
        settingsOpen = true;
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="jte-root" data-theme={theme} onkeydown={handleKeydown}
    style:--jte-bg={(isPlainMode ? bgColor : (pageWidth === 'full' ? pageColor : bgColor)) || null}
    style:--jte-page-canvas={bgColor || null}
    style:--jte-page-color={(!isPlainMode && pageWidth !== 'full' ? pageColor : null) || null}
    style:--jte-font={fontFamily || null}
    style:--jte-font-size={fontSize || null}
    style:--jte-line-height={lineHeight || null}>
    {#if activeTab}
        <TopBar
            name={activeTab.name}
            path={activeTab.path}
            modified={activeTab.modified}
            {isPlainMode}
            {mode}
            onaction={handleAction}
            onrename={handleRename}
            onback={() => onback?.()}
            onclose={() => onclose?.()}
            onminimize={() => onminimize?.()}
            onmaximize={() => onmaximize?.()}
            onlaunch={onlaunch ? () => onlaunch(activeTab) : undefined}
        />

        <div class="jte-editor-wrap">
            {#if tree && treeOpen}
                <div class="jte-tree-sidebar">
                    <TreeView {tree} {onfileopen} {onrequestdelete} />
                </div>
            {/if}
            <div class="jte-editor-main">
                {#if isPlainMode}
                    <CodeMirrorEditor
                        bind:this={editorRef}
                        content={activeTab.content}
                        language={activeTab.language}
                        {showInvisibles}
                        {showLineNumbers}
                        {wordWrap}
                        {highlightLine}
                        {showIndentGuides}
                        {fontSize}
                        {fontFamily}
                        {lineHeight}
                        onchange={handleChange}
                        oncursor={handleCursor}
                        {ai}
                    />
                {:else}
                    <RichTextEditor
                        bind:this={editorRef}
                        content={activeTab.content}
                        onchange={handleChange}
                        {pageWidth}
                        {wordWrap}
                        {ai}
                        toolbarPinned={toolbarMode === 'pinned' ? true : toolbarMode === 'bubble' ? false : undefined}
                        ontoolbarpin={(p) => { _toolbarMode = p ? 'pinned' : 'bubble'; notifySettings(); }}
                    />
                {/if}
            </div>
            {#if settingsOpen}
                <div class="jte-settings-sidebar">
                    <Settings
                        settings={{ showInvisibles, showLineNumbers, wordWrap, highlightLine, theme, pageWidth, bgColor, pageColor, fontFamily, fontSize, tabSize, lineHeight, defaultMode, toolbarMode }}
                        onsettingschange={(s) => {
                            if (s.showInvisibles != null) _showInvisibles = s.showInvisibles;
                            if (s.showLineNumbers != null) _showLineNumbers = s.showLineNumbers;
                            if (s.wordWrap != null) _wordWrap = s.wordWrap;
                            if (s.highlightLine != null) _highlightLine = s.highlightLine;
                            if (s.theme != null) _theme = s.theme;
                            if (s.pageWidth != null) _pageWidth = s.pageWidth;
                            if (s.bgColor != null) _bgColor = s.bgColor;
                            if (s.pageColor != null) _pageColor = s.pageColor;
                            if (s.fontFamily != null) _fontFamily = s.fontFamily;
                            if (s.fontSize != null) _fontSize = s.fontSize;
                            if (s.tabSize != null) _tabSize = s.tabSize;
                            if (s.lineHeight != null) _lineHeight = s.lineHeight;
                            if (s.defaultMode != null) _defaultMode = s.defaultMode;
                            if (s.toolbarMode != null) _toolbarMode = s.toolbarMode;
                            notifySettings();
                        }}
                        onclose={() => { settingsOpen = false; }}
                    />
                </div>
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
                {#if tree}
                    <button
                        class="jte-tree-toggle"
                        class:jte-tree-toggle-active={treeOpen}
                        title={treeOpen ? 'Hide Explorer' : 'Show Explorer'}
                        onclick={() => treeOpen = !treeOpen}
                    >
                        <span class="material-symbols-outlined">folder_open</span>
                    </button>
                {/if}
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
                    <span class="jte-status" title="Line {cursorLine}, Column {cursorCol}">{cursorLine}:{cursorCol}</span>
                    <span class="jte-status">{totalLines} lines</span>
                    <span class="jte-status">{lineEnding.toUpperCase()}</span>
                    <span class="jte-status">{indentLabel}</span>
                {:else}
                    <span class="jte-status">Rich Text</span>
                {/if}
                {#if ai}
                    <span class="jte-ai-status" class:jte-ai-active={editorRef?.aiGenerating} title="AI {editorRef?.aiGenerating ? 'generating...' : 'ready'}">
                        <span class="material-symbols-outlined">auto_awesome</span>
                    </span>
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
        --jte-input-bg: #ffffff;
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

    .jte-editor-main {
        flex: 1;
        min-width: 0;
        display: flex;
        position: relative;
    }

    .jte-tree-sidebar {
        width: 240px;
        flex-shrink: 0;
        border-right: 1px solid var(--jte-border, #333);
        overflow: hidden;
        background: var(--jte-bg, #1e1e1e);
    }

    .jte-tree-toggle {
        background: none;
        border: none;
        color: var(--jte-status-fg, #888);
        cursor: pointer;
        padding: 0 2px;
        display: flex;
        align-items: center;
    }
    .jte-tree-toggle .material-symbols-outlined { font-size: 16px; }
    .jte-tree-toggle:hover { color: var(--jte-fg, #d4d4d4); }
    .jte-tree-toggle-active { color: var(--jte-fg, #d4d4d4); }

    .jte-settings-sidebar {
        width: 280px;
        flex-shrink: 0;
        border-left: 1px solid var(--jte-border, #333);
        overflow-y: auto;
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
        background: var(--jte-menubar-bg, #252525);
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

    .jte-ai-status {
        display: flex;
        align-items: center;
        color: var(--jte-status-fg, #555);
        line-height: 1;
    }

    .jte-ai-status .material-symbols-outlined {
        font-size: 14px;
    }

    .jte-ai-active {
        color: var(--jte-accent, #569cd6);
        animation: jte-ai-pulse 1.2s ease-in-out infinite;
    }

    @keyframes jte-ai-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
    }
</style>
