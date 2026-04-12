<script>
  let { visible = false, shouldFocus = false, content = '', currentMatchIdx = -1, onaction } = $props();

  let searchTerm = $state('');
  let replaceTerm = $state('');
  let matchCase = $state(false);
  let wholeWord = $state(false);
  let useRegex = $state(false);
  let searchInput = $state();

  $effect(() => {
    if (visible && shouldFocus && searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  });

  function emit(action) {
    onaction?.(action, {
      search: searchTerm,
      replace: replaceTerm,
      matchCase,
      wholeWord,
      useRegex,
    });
  }

  function swap() {
    [searchTerm, replaceTerm] = [replaceTerm, searchTerm];
  }

  // Match counter
  let matchInfo = $derived.by(() => {
    if (!searchTerm || !content) return { current: 0, total: 0 };
    let pattern = useRegex ? searchTerm : searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (wholeWord) pattern = `\\b${pattern}\\b`;
    const flags = matchCase ? 'g' : 'gi';
    let re;
    try { re = new RegExp(pattern, flags); } catch { return { current: 0, total: 0 }; }
    const matches = [];
    let m;
    while ((m = re.exec(content)) !== null) {
      matches.push(m.index);
      if (!m[0].length) re.lastIndex++;
    }
    const total = matches.length;
    const current = currentMatchIdx >= 0 ? matches.indexOf(currentMatchIdx) + 1 : 0;
    return { current, total };
  });

  function handleKeydown(e) {
    if (e.key === 'Escape') onaction?.('find.close');
    if (e.key === 'Enter') {
      e.preventDefault();
      emit(e.shiftKey ? 'find.prev' : 'find.next');
    }
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="jte-find" onkeydown={handleKeydown}>
    <input
      bind:this={searchInput}
      bind:value={searchTerm}
      class="jte-find-input"
      placeholder="Find"
      oninput={() => emit('find.next')}
    />

    <button class="jte-fo" title="Swap" onclick={swap}>
      <span class="material-symbols-outlined">swap_horiz</span>
    </button>

    <input
      bind:value={replaceTerm}
      class="jte-find-input"
      placeholder="Replace"
    />

    <span class="jte-find-sep"></span>

    <button class="jte-fo" class:on={matchCase} title="Match Case" onclick={() => { matchCase = !matchCase; emit('find.next'); }}>
      <span class="material-symbols-outlined">match_case</span>
    </button>
    <button class="jte-fo" class:on={wholeWord} title="Match Whole Word" onclick={() => { wholeWord = !wholeWord; emit('find.next'); }}>
      <span class="material-symbols-outlined">match_word</span>
    </button>
    <button class="jte-fo" class:on={useRegex} title="Use Regular Expression" onclick={() => { useRegex = !useRegex; emit('find.next'); }}>
      <span class="material-symbols-outlined">regular_expression</span>
    </button>

    <span class="jte-find-sep"></span>

    <button class="jte-fo" title="Previous (Shift+Enter)" onclick={() => emit('find.prev')}>
      <span class="material-symbols-outlined">keyboard_arrow_up</span>
    </button>
    <button class="jte-fo" title="Next (Enter)" onclick={() => emit('find.next')}>
      <span class="material-symbols-outlined">keyboard_arrow_down</span>
    </button>

    <span class="jte-find-sep"></span>

    <button class="jte-fo" title="Replace" onclick={() => emit('find.replace')}>
      <span class="material-symbols-outlined">check</span>
    </button>
    <button class="jte-fo" title="Replace All" onclick={() => emit('find.replaceAll')}>
      <span class="material-symbols-outlined">done_all</span>
    </button>

    <span class="jte-find-sep"></span>

    <span class="jte-match-count">{searchTerm ? `${matchInfo.current}/${matchInfo.total}` : '0/0'}</span>

    <button class="jte-fo" title="Close (Esc)" onclick={() => onaction?.('find.close')}>
      <span class="material-symbols-outlined">close</span>
    </button>
  </div>
{/if}

<style>
  .jte-find {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 1px;
    padding: 0;
    background: var(--jte-menubar-bg, #353535);
    border: 1px solid var(--jte-border, #444);
    border-radius: 4px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    font-family: var(--jte-ui-font, system-ui, -apple-system, sans-serif);
    font-size: 12px;
    overflow: hidden;
  }

  .jte-find-input {
    padding: 5px 10px;
    background: var(--jte-bg, #1e1e1e);
    border: none;
    color: var(--jte-fg, #d4d4d4);
    font-family: inherit;
    font-size: inherit;
    outline: none;
    width: 110px;
  }

  .jte-find-input:focus {
    background: var(--jte-bg, #1a1a1a);
  }

  .jte-fo {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--jte-toolbar-fg, #aaa);
    padding: 4px;
    cursor: pointer;
    line-height: 1;
  }

  .jte-fo:hover {
    color: var(--jte-fg, #d4d4d4);
  }

  .jte-fo.on {
    color: var(--jte-accent, #569cd6);
  }

  .jte-fo .material-symbols-outlined {
    font-size: 16px;
  }

  .jte-find-sep {
    width: 1px;
    height: 16px;
    background: var(--jte-border, #555);
    margin: 0 2px;
    flex-shrink: 0;
  }

  .jte-match-count {
    color: var(--jte-status-fg, #888);
    font-size: 11px;
    padding: 0 4px;
    white-space: nowrap;
  }
</style>
