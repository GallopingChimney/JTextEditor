<script>
    import TopBar from "./TopBar.svelte";
    import TabBar from "./TabBar.svelte";
    import CodeMirrorEditor from "./CodeMirrorEditor.svelte";
    import RichTextEditor from "./RichTextEditor.svelte";
    import { detectLineEnding, splitLines } from "./lib/characters.js";
    import { languages } from "./lib/languages.js";

    let {
        tabs: initialTabs = [],
        onopen,
        onsave,
        onsaveAs,
        ontabchange,
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

    let showInvisibles = $state(false);
    let showLineNumbers = $state(true);
    let wordWrap = $state(false);
    let highlightLine = $state(true);
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
            mode: "plain",
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
                wordWrap = !wordWrap;
                break;
            case "view.lineNumbers":
                showLineNumbers = !showLineNumbers;
                break;
            case "view.highlightLine":
                highlightLine = !highlightLine;
                break;
            case "view.invisibles":
                showInvisibles = !showInvisibles;
                break;
            case "view.toggleMode": {
                const tab = tabs.find((t) => t.id === activeTabId);
                if (tab) tab.mode = tab.mode === "rich" ? "plain" : "rich";
                break;
            }
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
            showInvisibles = !showInvisibles;
        }
        if (e.altKey && e.key === "z") {
            e.preventDefault();
            wordWrap = !wordWrap;
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
<div class="jte-root" onkeydown={handleKeydown}>
    {#if activeTab}
        <TopBar
            name={activeTab.name}
            path={activeTab.path}
            {showLineNumbers}
            {wordWrap}
            {showInvisibles}
            {highlightLine}
            {isPlainMode}
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
                    content={activeTab.content}
                    onchange={handleChange}
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
</style>
