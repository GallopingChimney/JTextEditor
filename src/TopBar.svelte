<script>
  let {
    name = 'Untitled',
    path = '',
    modified = false,
    showLineNumbers = true,
    wordWrap = false,
    showInvisibles = false,
    highlightLine = true,
    isPlainMode = true,
    theme = 'dark',
    pageWidth = 'full',
    bgColor = '',
    pageCanvasColor = '',
    pageColor = '',
    onaction,
    onback,
    onclose,
  } = $props();

  let openDropdown = $state(null);
  let barEl = $state();

  let breadcrumbDir = $derived.by(() => {
    if (!path) return '';
    const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
    if (parts.length <= 1) return '';
    return parts.slice(-2, -1)[0] + ' / ';
  });
  let breadcrumbFile = $derived.by(() => {
    if (!path) return name;
    const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
    return parts[parts.length - 1] || name;
  });

  function toggle(dd) {
    openDropdown = openDropdown === dd ? null : dd;
  }

  function action(a) {
    openDropdown = null;
    onaction?.(a);
  }

  function liveAction(a) {
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

    <span class="jte-breadcrumb">{breadcrumbDir}<span class="jte-breadcrumb-file">{breadcrumbFile}</span>{#if modified}<span class="jte-dirty">*</span>{/if}</span>
  </div>

  <div class="jte-top-right">
    <button class="jte-tb" title="Find & Replace (Ctrl+F)" onclick={() => action('edit.find')}>
      <span class="material-symbols-outlined">search</span>
    </button>

    <span class="jte-top-sep"></span>

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
          {#if !isPlainMode}
            <span class="jte-dd-label">Page Width</span>
            <div class="jte-pw-group">
              <button class="jte-pw-btn" class:active={pageWidth === 'narrow'} title="Narrow" onclick={() => action('view.pageWidth.narrow')}>
                <span class="material-symbols-outlined">crop_9_16</span>
              </button>
              <button class="jte-pw-btn" class:active={pageWidth === 'normal'} title="Normal" onclick={() => action('view.pageWidth.normal')}>
                <span class="material-symbols-outlined">crop_square</span>
              </button>
              <button class="jte-pw-btn" class:active={pageWidth === 'wide'} title="Wide" onclick={() => action('view.pageWidth.wide')}>
                <span class="material-symbols-outlined">crop_16_9</span>
              </button>
              <button class="jte-pw-btn" class:active={pageWidth === 'full'} title="Full" onclick={() => action('view.pageWidth.full')}>
                <span class="material-symbols-outlined">open_in_full</span>
              </button>
            </div>
          {/if}
          {#if isPlainMode || pageWidth === 'full'}
            <div class="jte-dd-sep"></div>
            <button class="jte-dd-item" onclick={() => action('view.wordWrap')}>
              <span class="material-symbols-outlined" class:on={wordWrap}>wrap_text</span>
              Word Wrap
              {#if wordWrap}<span class="jte-check">&#10003;</span>{/if}
            </button>
          {/if}
          <div class="jte-dd-sep"></div>
          <span class="jte-dd-label">Colors</span>
          {#if isPlainMode}
            <label class="jte-dd-color-row">
              <span>Background</span>
              <input type="color" value={bgColor || (theme === 'dark' ? '#1e1e1e' : '#ffffff')} oninput={(e) => liveAction('view.bgColor:' + e.target.value)} />
            </label>
          {:else}
            <label class="jte-dd-color-row">
              <span>Page</span>
              <input type="color" value={pageColor || (theme === 'dark' ? '#252525' : '#f3f3f3')} oninput={(e) => liveAction('view.pageColor:' + e.target.value)} />
            </label>
            {#if pageWidth !== 'full'}
              <label class="jte-dd-color-row">
                <span>Background</span>
                <input type="color" value={pageCanvasColor || (theme === 'dark' ? '#181818' : '#e8e8e8')} oninput={(e) => liveAction('view.pageCanvasColor:' + e.target.value)} />
              </label>
            {/if}
          {/if}
          {#if isPlainMode}
            <div class="jte-dd-sep"></div>
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

  .jte-breadcrumb-file {
    color: var(--jte-fg, #d4d4d4);
  }

  .jte-dirty {
    color: #e06c75;
    margin-left: 2px;
    font-weight: bold;
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
    z-index: 300;
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

  .jte-dd-label {
    display: block;
    padding: 2px 8px;
    color: var(--jte-status-fg, #666);
    font-family: var(--jte-ui-font, system-ui, sans-serif);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .jte-dd-sep {
    height: 1px;
    background: var(--jte-border, #333);
    margin: 4px 0;
  }

  .jte-dd-color-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 3px 8px;
    font-family: var(--jte-ui-font, system-ui, sans-serif);
    font-size: 12px;
    color: var(--jte-toolbar-fg, #ccc);
    cursor: pointer;
  }

  .jte-dd-color-row input[type="color"] {
    width: 22px;
    height: 18px;
    padding: 0;
    border: 1px solid var(--jte-border, #444);
    border-radius: 3px;
    background: transparent;
    cursor: pointer;
  }

  .jte-dd-color-row input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 1px;
  }

  .jte-dd-color-row input[type="color"]::-webkit-color-swatch {
    border: none;
    border-radius: 2px;
  }

  .jte-pw-group {
    display: inline-flex;
    margin: 2px 4px;
    border: 1px solid var(--jte-border, #3a3a3a);
    border-radius: 5px;
    overflow: hidden;
  }

  .jte-pw-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 8px;
    background: transparent;
    border: none;
    color: var(--jte-toolbar-fg, #aaa);
    cursor: pointer;
    line-height: 1;
  }

  .jte-pw-btn + .jte-pw-btn {
    border-left: 1px solid var(--jte-border, #3a3a3a);
  }

  .jte-pw-btn:hover { background: var(--jte-toolbar-hover, #333); }
  .jte-pw-btn.active { color: var(--jte-accent, #569cd6); background: rgba(86, 156, 214, 0.1); }
  .jte-pw-btn .material-symbols-outlined { font-size: 16px; }
</style>
