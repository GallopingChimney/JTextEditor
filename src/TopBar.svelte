<script>
  let {
    name = 'Untitled',
    path = '',
    showLineNumbers = true,
    wordWrap = false,
    showInvisibles = false,
    highlightLine = true,
    isPlainMode = true,
    onaction,
    onback,
    onclose,
  } = $props();

  let openDropdown = $state(null);
  let barEl = $state();

  let breadcrumb = $derived.by(() => {
    if (!path) return name;
    const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
    if (parts.length <= 2) return parts.join(' / ');
    return parts.slice(-2).join(' / ');
  });

  function toggle(dd) {
    openDropdown = openDropdown === dd ? null : dd;
  }

  function action(a) {
    openDropdown = null;
    onaction?.(a);
  }

  $effect(() => {
    if (!openDropdown) return;
    function onClick(e) {
      if (barEl && !barEl.contains(e.target)) openDropdown = null;
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  });
</script>

<div class="jte-topbar" bind:this={barEl}>
  <div class="jte-top-left">
    <button class="jte-tb" title="Back" onclick={() => onback?.()}>
      <span class="material-symbols-outlined">chevron_left</span>
    </button>

    <div class="jte-dd-wrap">
      <button class="jte-tb" title="Menu" onclick={() => toggle('menu')}>
        <span class="material-symbols-outlined">menu</span>
      </button>
      {#if openDropdown === 'menu'}
        <div class="jte-dropdown jte-dropdown-left">
          <button class="jte-dd-item" onclick={() => action('file.new')}>
            <span class="material-symbols-outlined">note_add</span> New
          </button>
          <button class="jte-dd-item" onclick={() => action('file.open')}>
            <span class="material-symbols-outlined">folder_open</span> Open
          </button>
          <button class="jte-dd-item" onclick={() => action('file.save')}>
            <span class="material-symbols-outlined">save</span> Save
          </button>
          <button class="jte-dd-item" onclick={() => action('file.saveAs')}>
            <span class="material-symbols-outlined">save_as</span> Save As
          </button>
          <div class="jte-dd-sep"></div>
          <button class="jte-dd-item" onclick={() => action('file.closeTab')}>
            <span class="material-symbols-outlined">close</span> Close Tab
          </button>
        </div>
      {/if}
    </div>

    <span class="jte-breadcrumb">{breadcrumb}</span>
  </div>

  <div class="jte-top-right">
    {#if isPlainMode}
      <button class="jte-tb" title="Find & Replace (Ctrl+F)" onclick={() => action('edit.find')}>
        <span class="material-symbols-outlined">search</span>
      </button>

      <span class="jte-top-sep"></span>
    {/if}

    <button
      class="jte-tb jte-mode-toggle"
      class:active={!isPlainMode}
      title={isPlainMode ? "Switch to Rich Text" : "Switch to Plain Text"}
      onclick={() => action('view.toggleMode')}
    >
      <span class="material-symbols-outlined">{isPlainMode ? 'code' : 'edit_note'}</span>
    </button>

    <span class="jte-top-sep"></span>

    <div class="jte-dd-wrap">
      <button class="jte-tb" title="View options" onclick={() => toggle('view')}>
        <span class="material-symbols-outlined">tune</span>
      </button>
      {#if openDropdown === 'view'}
        <div class="jte-dropdown">
          <button class="jte-dd-item" onclick={() => action('view.wordWrap')}>
            <span class="material-symbols-outlined" class:on={wordWrap}>wrap_text</span>
            Word Wrap
            {#if wordWrap}<span class="jte-check">&#10003;</span>{/if}
          </button>
          {#if isPlainMode}
            <button class="jte-dd-item" onclick={() => action('view.lineNumbers')}>
              <span class="material-symbols-outlined" class:on={showLineNumbers}>format_list_numbered</span>
              Line Numbers
              {#if showLineNumbers}<span class="jte-check">&#10003;</span>{/if}
            </button>
            <button class="jte-dd-item" onclick={() => action('view.highlightLine')}>
              <span class="material-symbols-outlined" class:on={highlightLine}>highlight</span>
              Highlight Line
              {#if highlightLine}<span class="jte-check">&#10003;</span>{/if}
            </button>
            <button class="jte-dd-item" onclick={() => action('view.invisibles')}>
              <span class="material-symbols-outlined" class:on={showInvisibles}>space_bar</span>
              Invisibles
              {#if showInvisibles}<span class="jte-check">&#10003;</span>{/if}
            </button>
          {/if}
        </div>
      {/if}
    </div>

    <span class="jte-top-sep"></span>

    <button class="jte-tb" title="Close" onclick={() => onclose?.()}>
      <span class="material-symbols-outlined">close</span>
    </button>
  </div>
</div>

<style>
  .jte-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 3px 6px;
    background: var(--jte-menubar-bg, #252525);
    border-bottom: 1px solid var(--jte-border, #333);
    flex-shrink: 0;
    user-select: none;
  }

  .jte-top-left {
    display: flex;
    align-items: center;
    gap: 2px;
    min-width: 0;
  }

  .jte-top-right {
    display: flex;
    align-items: center;
    gap: 1px;
    flex-shrink: 0;
  }

  .jte-breadcrumb {
    color: var(--jte-status-fg, #777);
    font-family: var(--jte-ui-font, system-ui, sans-serif);
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-left: 4px;
  }

  .jte-tb {
    display: flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: none;
    color: var(--jte-toolbar-fg, #aaa);
    padding: 4px 5px;
    cursor: pointer;
    border-radius: 4px;
    line-height: 1;
  }

  .jte-tb:hover {
    background: var(--jte-toolbar-hover, #333);
    color: var(--jte-fg, #d4d4d4);
  }

  .jte-mode-toggle.active {
    color: var(--jte-accent, #569cd6);
  }

  .jte-tb .material-symbols-outlined { font-size: 16px; }

  .jte-top-sep {
    width: 1px;
    height: 16px;
    background: var(--jte-border, #333);
    margin: 0 3px;
    flex-shrink: 0;
  }

  .jte-dd-wrap { position: relative; }

  .jte-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 160px;
    background: var(--jte-menubar-bg, #252525);
    border: 1px solid var(--jte-border, #3a3a3a);
    border-radius: 6px;
    padding: 4px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    z-index: 60;
  }

  .jte-dropdown-left { left: 0; right: auto; }

  .jte-dd-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 5px 8px;
    background: transparent;
    border: none;
    color: var(--jte-toolbar-fg, #ccc);
    cursor: pointer;
    font-family: var(--jte-ui-font, system-ui, sans-serif);
    font-size: 12px;
    text-align: left;
    border-radius: 4px;
    white-space: nowrap;
  }

  .jte-dd-item:hover { background: var(--jte-toolbar-hover, #333); }
  .jte-dd-item .material-symbols-outlined { font-size: 16px; }
  .jte-dd-item .material-symbols-outlined.on { color: var(--jte-accent, #569cd6); }
  .jte-check { margin-left: auto; color: var(--jte-accent, #569cd6); font-size: 12px; }

  .jte-dd-sep {
    height: 1px;
    background: var(--jte-border, #333);
    margin: 4px 0;
  }
</style>
