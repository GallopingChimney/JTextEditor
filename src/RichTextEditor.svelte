<script>
  let { content = '', onchange } = $props();

  let editorEl = $state();

  function handleInput() {
    if (editorEl) {
      onchange?.(editorEl.innerHTML);
    }
  }

  $effect(() => {
    if (editorEl && !editorEl.innerHTML) {
      editorEl.innerHTML = content || '<div><br></div>';
    }
  });
</script>

<div
  bind:this={editorEl}
  class="jte-rich-content"
  contenteditable="true"
  oninput={handleInput}
  role="textbox"
  aria-multiline="true"
></div>

<style>
  .jte-rich-content {
    flex: 1;
    padding: 12px 16px;
    overflow: auto;
    outline: none;
    color: var(--jte-fg, #d4d4d4);
    font-family: var(--jte-ui-font, system-ui, -apple-system, sans-serif);
    font-size: 15px;
    line-height: 1.6;
  }

  .jte-rich-content :global(blockquote) {
    border-left: 3px solid var(--jte-accent, #569cd6);
    margin: 8px 0;
    padding: 4px 12px;
    color: var(--jte-status-fg, #888);
  }

  .jte-rich-content :global(pre) {
    background: var(--jte-bg, #1e1e1e);
    border: 1px solid var(--jte-border, #333);
    border-radius: 4px;
    padding: 8px 12px;
    font-family: var(--jte-font, 'Cascadia Code', 'Fira Code', 'Consolas', monospace);
    font-size: 14px;
  }

  .jte-rich-content :global(h1) { font-size: 1.8em; margin: 12px 0 8px; }
  .jte-rich-content :global(h2) { font-size: 1.4em; margin: 10px 0 6px; }
</style>
