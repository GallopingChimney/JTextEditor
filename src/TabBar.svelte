<script>
    let { tabs = [], activeTabId = "", onselect, onclose, onnewTab } = $props();
</script>

<div class="jte-tabbar">
    {#each tabs as tab (tab.id)}
        <button
            class="jte-tab-pill"
            class:active={tab.id === activeTabId}
            onclick={() => onselect?.(tab.id)}
            title={tab.path || tab.name}
        >
            <span class="jte-tab-name">
                {tab.name}{#if tab.modified}<span class="jte-tab-dirty">*</span>{/if}
            </span>
            <span
                class="jte-tab-close"
                onclick={(e) => {
                    e.stopPropagation();
                    onclose?.(tab.id);
                }}
                role="button"
                tabindex="-1">&times;</span
            >
        </button>
    {/each}
    <button
        class="jte-tab-pill jte-tab-new"
        onclick={() => onnewTab?.()}
        title="New Tab">+</button
    >
</div>

<style>
    .jte-tabbar {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 0px 0px 0px 8px;
        flex-shrink: 0;
        user-select: none;
        overflow-x: auto;
        scrollbar-width: none;
    }

    .jte-tabbar::-webkit-scrollbar {
        display: none;
    }

    .jte-tab-pill {
        display: flex;
        align-items: center;
        gap: 4px;
        height: 20px;
        padding: 2px 2px 2px 8px;
        background: transparent;
        border: none;
        border-radius: 0px 0px 2px 2px;
        color: var(--jte-status-fg, #888);
        cursor: pointer;
        font-family: var(--jte-ui-font, system-ui, -apple-system, sans-serif);
        font-size: 11px;
        white-space: nowrap;
        flex-shrink: 0;
        transition:
            background 0.1s,
            color 0.1s;
    }

    .jte-tab-pill:hover {
        background: var(--jte-toolbar-hover, #333);
        color: var(--jte-toolbar-fg, #ccc);
    }

    .jte-tab-pill.active {
        background: var(--jte-toolbar-hover, #333);
        border-bottom: 2px solid var(--jte-accent, #569cd6);
        color: var(--jte-fg, #d4d4d4);
    }

    .jte-tab-dirty {
        color: #e06c75;
        margin-left: 1px;
        font-weight: bold;
    }

    .jte-tab-name {
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .jte-tab-close {
        font-size: 13px;
        line-height: 1;
        opacity: 0.5;
        border-radius: 50%;
        width: 14px;
        height: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .jte-tab-close:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.3);
    }

    .jte-tab-new {
        padding: 2px 4px;
        font-size: 14px;
        font-weight: bold;
        line-height: 1;
    }
</style>
