<script>
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { getMatches } from '@tauri-apps/plugin-cli';
  import { readTextFile } from '@tauri-apps/plugin-fs';
  import JTextEditor from '../../src/JTextEditor.svelte';

  const win = getCurrentWindow();

  let editorRef = $state();
  let initialTabs = $state([]);
  let ready = $state(false);

  async function init() {
    try {
      const matches = await getMatches();
      const filePath = matches.args?.file?.value;
      if (filePath) {
        const content = await readTextFile(filePath);
        const name = filePath.replace(/\\/g, '/').split('/').pop();
        const ext = name.includes('.') ? name.split('.').pop() : '';
        initialTabs = [{ id: 'tab-1', name, content, language: ext, mode: 'plain', path: filePath }];
      }
    } catch {
      // No CLI args or read failed — open with empty tab
    }
    ready = true;
  }

  init();
</script>

{#if ready}
  <JTextEditor
    bind:this={editorRef}
    tabs={initialTabs}
    mode="app"
    onminimize={() => win.minimize()}
    onmaximize={() => win.toggleMaximize()}
    onclose={() => win.close()}
  />
{/if}
