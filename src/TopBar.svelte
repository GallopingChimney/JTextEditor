<script>
  let {
    name = 'Untitled',
    path = '',
    modified = false,
    isPlainMode = true,
    mode = 'sidecar',
    hasTree = false,
    treeOpen = false,
    ontoggletree = undefined,
    onaction,
    onback,
    onclose,
    onminimize,
    onmaximize,
    onrename,
    onlaunch = undefined,
  } = $props();

  let openDropdown = $state(null);
  let barEl = $state();
  let editing = $state(false);
  let editEl = $state();
  let pathCopied = $state(false);

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


  function startEditing() {
    editing = true;
    // tick: wait for contenteditable to mount, then populate and select
    requestAnimationFrame(() => {
      if (!editEl) return;
      editEl.textContent = breadcrumbFile;
      const range = document.createRange();
      const dot = breadcrumbFile.lastIndexOf('.');
      range.setStart(editEl.firstChild, 0);
      range.setEnd(editEl.firstChild, dot > 0 ? dot : breadcrumbFile.length);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
  }

  function commitRename() {
    if (!editing) return;
    const raw = (editEl?.textContent || '').trim();
    editing = false;
    if (raw && raw !== breadcrumbFile) {
      onrename?.(raw);
    }
  }

  function onEditKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      editEl?.blur();
    } else if (e.key === 'Escape') {
      editing = false;
    }
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

<div class="jte-topbar" class:jte-topbar-app={mode === 'app'} bind:this={barEl}>
  <div class="jte-top-left">
    {#if mode === 'sidecar'}
      <button class="jte-tb" title="Back" onclick={() => onback?.()}>
        <span class="material-symbols-outlined">chevron_left</span>
      </button>
    {/if}

    {#if hasTree}
      <button
        class="jte-tb jte-tree-toggle-btn"
        class:active={treeOpen}
        title={treeOpen ? 'Hide Explorer' : 'Show Explorer'}
        onclick={() => ontoggletree?.()}
      >
        <span class="material-symbols-outlined">side_navigation</span>
      </button>
    {/if}

    <div class="jte-dd-wrap">
      <button class="jte-tb jte-menu-btn" title="Menu" onclick={() => toggle('menu')}>
        <span class="material-symbols-outlined">menu</span>
      </button>
      {#if openDropdown === 'menu'}
        <div class="jte-dropdown jte-dropdown-left">
          <button class="jte-dd-item" onclick={() => action('file.new')}>
            <span class="material-symbols-outlined">note_add</span> New <span class="jte-dd-shortcut">Ctrl+N</span>
          </button>
          <button class="jte-dd-item" onclick={() => action('file.open')}>
            <span class="material-symbols-outlined">folder_open</span> Open <span class="jte-dd-shortcut">Ctrl+O</span>
          </button>
          <button class="jte-dd-item" onclick={() => action('file.save')}>
            <span class="material-symbols-outlined">save</span> Save <span class="jte-dd-shortcut">Ctrl+S</span>
          </button>
          <button class="jte-dd-item" onclick={() => action('file.saveAs')}>
            <span class="material-symbols-outlined">save_as</span> Save As <span class="jte-dd-shortcut">Ctrl+Shift+S</span>
          </button>
          <div class="jte-dd-sep"></div>
          <button class="jte-dd-item" onclick={() => action('file.closeTab')}>
            <span class="material-symbols-outlined">close</span> Close Tab <span class="jte-dd-shortcut">Ctrl+W</span>
          </button>
          <div class="jte-dd-sep"></div>
          <button class="jte-dd-item" onclick={() => action('file.settings')}>
            <span class="material-symbols-outlined">settings</span> Settings <span class="jte-dd-shortcut">Ctrl+,</span>
          </button>
        </div>
      {/if}
    </div>

    <span class="jte-breadcrumb">
      {breadcrumbDir}{#if editing}<span
        class="jte-breadcrumb-file jte-breadcrumb-edit"
        contenteditable="true"
        role="textbox"
        tabindex="-1"
        bind:this={editEl}
        onkeydown={onEditKey}
        onblur={commitRename}
      ></span>{:else}<span
        class="jte-breadcrumb-file"
        role="button"
        tabindex="-1"
        ondblclick={startEditing}
      >{breadcrumbFile}</span>{/if}{#if modified}<span class="jte-dirty">*</span>{/if}
    </span>
    {#if path}
      <button class="jte-tb jte-copy-path-btn" title="Copy file path" onclick={() => {
        navigator.clipboard.writeText(path);
        pathCopied = true;
        setTimeout(() => pathCopied = false, 1500);
      }}>
        <span class="material-symbols-outlined">{pathCopied ? 'check' : 'content_copy'}</span>
      </button>
    {/if}
    {#if onlaunch}
      <button class="jte-tb jte-launch-btn" title="Open in separate window" onclick={() => onlaunch?.()}>
        <span class="material-symbols-outlined">open_in_new</span>
      </button>
    {/if}
  </div>

  <div class="jte-top-right">
    <div class="jte-top-actions">
      <button
        class="jte-tb jte-mode-toggle"
        class:active={!isPlainMode}
        class:code={isPlainMode}
        title={isPlainMode ? "Switch to Rich Text" : "Switch to Plain Text"}
        onclick={() => action('view.toggleMode')}
      >
        <span class="material-symbols-outlined">{isPlainMode ? 'code' : 'edit_note'}</span>
        <span class="jte-mode-label">{isPlainMode ? 'Code' : 'Rich Text'}</span>
      </button>

      <button class="jte-tb" title="Find & Replace (Ctrl+F)" onclick={() => action('edit.toggleFind')}>
        <span class="material-symbols-outlined">search</span>
      </button>

      <button class="jte-tb" title="Copy all content" onclick={() => action('edit.copyAll')}>
        <span class="material-symbols-outlined">content_copy</span>
      </button>

      <button class="jte-tb" title="Settings (Ctrl+,)" onclick={() => action('file.settings')}>
        <span class="material-symbols-outlined">settings</span>
      </button>
    </div>

    <span class="jte-top-sep"></span>

    {#if mode === 'app'}
      <button class="jte-tb jte-window-btn" title="Minimize" onclick={() => onminimize?.()}>
        <span class="material-symbols-outlined">minimize</span>
      </button>
      <button class="jte-tb jte-window-btn" title="Maximize" onclick={() => onmaximize?.()}>
        <span class="material-symbols-outlined">crop_square</span>
      </button>
      <button class="jte-tb jte-window-btn jte-window-close" title="Close" onclick={() => onclose?.()}>
        <span class="material-symbols-outlined">close</span>
      </button>
    {:else}
      <button class="jte-tb" title="Close" onclick={() => onclose?.()}>
        <span class="material-symbols-outlined">close</span>
      </button>
    {/if}
  </div>
</div>

<style>
  .jte-topbar {
    display: flex;
    height: 30px;
    align-items: center;
    justify-content: space-between;
    padding: 3px 6px;
    background: var(--jte-menubar-bg, );
    border-bottom: 1px solid var(--jte-border, #272727);
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
    cursor: default;
  }

  .jte-breadcrumb-file[role="button"]:hover {
    text-decoration: underline;
    text-decoration-style: dotted;
    text-underline-offset: 2px;
  }

  .jte-breadcrumb-edit {
    outline: none;
    background: var(--jte-input-focus-bg, #2a2a2a);
    border-radius: 3px;
    padding: 0 4px;
    min-width: 40px;
    display: inline-block;
  }

  .jte-dirty {
    color: #e06c75;
    margin-left: 2px;
    font-weight: bold;
  }

  .jte-copy-path-btn {
    padding: 2px 3px;
    margin-left: 2px;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .jte-top-left:hover .jte-copy-path-btn {
    opacity: 1;
  }

  .jte-copy-path-btn .material-symbols-outlined {
    font-size: 13px;
  }

  .jte-launch-btn {
    padding: 2px 3px;
    margin-left: 2px;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .jte-top-left:hover .jte-launch-btn {
    opacity: 1;
  }

  .jte-launch-btn .material-symbols-outlined {
    font-size: 14px;
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

  .jte-menu-btn .material-symbols-outlined {
    font-size: 20px;
  }

  .jte-mode-toggle.active {
    color: var(--jte-accent, #569cd6);
  }

  .jte-mode-toggle.code {
    color: #e5a045;
  }

  .jte-mode-label {
    font-family: var(--jte-ui-font, system-ui, sans-serif);
    font-size: 11px;
  }

  .jte-top-actions {
    display: flex;
    align-items: center;
    gap: 1px;
  }

  .jte-tb .material-symbols-outlined { font-size: 16px; }

  .jte-tree-toggle-btn .material-symbols-outlined {
    font-size: 20px;
    font-weight: 300;
  }
  .jte-tree-toggle-btn {
    color: var(--jte-status-fg, #888);
  }
  .jte-tree-toggle-btn.active {
    color: var(--jte-fg, #d4d4d4);
  }

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
  .jte-dd-shortcut {
    margin-left: auto;
    font-size: 10px;
    color: var(--jte-status-fg, #666);
    font-family: var(--jte-ui-font, system-ui, sans-serif);
  }
  .jte-dd-sep {
    height: 1px;
    background: var(--jte-border, #333);
    margin: 4px 0;
  }

  /* App mode — draggable title bar */
  .jte-topbar-app {
    -webkit-app-region: drag;
  }

  .jte-topbar-app :global(button),
  .jte-topbar-app :global(select),
  .jte-topbar-app :global(input),
  .jte-topbar-app :global([contenteditable]),
  .jte-topbar-app :global(.jte-dropdown),
  .jte-topbar-app :global(.jte-breadcrumb) {
    -webkit-app-region: no-drag;
  }

  /* Window control buttons */
  .jte-window-btn {
    padding: 4px 8px;
  }

  .jte-window-btn .material-symbols-outlined {
    font-size: 16px;
  }

  .jte-window-close:hover {
    background: #e81123;
    color: #fff;
  }
</style>
