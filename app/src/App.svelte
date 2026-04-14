<script>
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { getMatches } from '@tauri-apps/plugin-cli';
  import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
  import { open, save } from '@tauri-apps/plugin-dialog';
  import JTextEditor from '../../src/JTextEditor.svelte';
  import Settings from '../../src/Settings.svelte';
  import { createAiProvider } from './ai-provider.js';

  const win = getCurrentWindow();
  const STORAGE_KEY = 'jtexteditor-settings';
  const AI_STORAGE_KEY = 'jtexteditor-ai';

  const TEXT_FILTERS = [
    { name: 'Text files', extensions: ['txt', 'md', 'json', 'yaml', 'yml', 'toml', 'xml', 'html', 'css', 'ini', 'cfg', 'log', 'diff'] },
    { name: 'Code', extensions: ['js', 'ts', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'rb', 'php', 'swift', 'kt', 'lua', 'sql', 'sh', 'ps1'] },
    { name: 'All files', extensions: ['*'] },
  ];

  let editorRef = $state();
  let initialTabs = $state([]);
  let ready = $state(false);
  let showSettings = $state(false);

  // Persisted settings
  let editorSettings = $state(loadJSON(STORAGE_KEY, {}));
  let aiSettings = $state(loadJSON(AI_STORAGE_KEY, { provider: 'none', endpoint: '', apiKey: '', model: '' }));
  let ai = $derived(createAiProvider(aiSettings));

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  function handleSettingsChange(s) {
    editorSettings = s;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  function handleAiSettingsChange(s) {
    aiSettings = s;
    localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(s));
  }

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

  async function handleOpen() {
    try {
      const filePath = await open({ filters: TEXT_FILTERS, multiple: false });
      if (!filePath) return;
      const content = await readTextFile(filePath);
      const name = filePath.replace(/\\/g, '/').split('/').pop();
      const ext = name.includes('.') ? name.split('.').pop() : '';
      editorRef.openFile({ name, content, language: ext, path: filePath });
    } catch (e) {
      console.error('Open failed:', e);
    }
  }

  async function handleSave(tab) {
    if (!tab) return;
    try {
      if (tab.path) {
        await writeTextFile(tab.path, tab.content);
        editorRef.markSaved(tab.path);
      } else {
        await handleSaveAs(tab);
      }
    } catch (e) {
      console.error('Save failed:', e);
    }
  }

  async function handleSaveAs(tab) {
    if (!tab) return;
    try {
      const filePath = await save({ filters: TEXT_FILTERS, defaultPath: tab.name });
      if (!filePath) return;
      await writeTextFile(filePath, tab.content);
      editorRef.markSaved(filePath);
    } catch (e) {
      console.error('Save As failed:', e);
    }
  }

  function handleKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault();
      showSettings = !showSettings;
    }
    if (e.key === 'Escape' && showSettings) {
      showSettings = false;
    }
  }

  init();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="app-root" data-theme={editorSettings.theme || 'dark'} onkeydown={handleKeydown}>
  {#if ready}
    <div class="app-layout">
      <div class="app-editor">
        <JTextEditor
          bind:this={editorRef}
          tabs={initialTabs}
          settings={editorSettings}
          mode="app"
          {ai}
          onopen={handleOpen}
          onsave={handleSave}
          onsaveAs={handleSaveAs}
          onminimize={() => win.minimize()}
          onmaximize={() => win.toggleMaximize()}
          onclose={() => win.close()}
          onsettingschange={handleSettingsChange}
          onsettings={() => showSettings = !showSettings}
        />
      </div>
      {#if showSettings}
        <div class="settings-sidebar">
          <Settings
            settings={editorSettings}
            aiSettings={aiSettings}
            onsettingschange={handleSettingsChange}
            onaisettingschange={handleAiSettingsChange}
            onclose={() => showSettings = false}
          />
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .app-root {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: var(--jte-bg, #1e1e1e);
  }

  .app-layout {
    display: flex;
    width: 100%;
    height: 100%;
  }

  .app-editor {
    flex: 1;
    min-width: 0;
    height: 100%;
  }

  .settings-sidebar {
    width: 300px;
    flex-shrink: 0;
    height: 100%;
    border-left: 1px solid var(--jte-border, #333);
    background: var(--jte-menubar-bg, #252525);
    animation: slide-in 0.15s ease-out;
    position: relative;
    z-index: 200;
  }

  @keyframes slide-in {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  /* Match light theme vars from JTextEditor */
  .app-root[data-theme="light"] {
    --jte-bg: #ffffff;
    --jte-fg: #1e1e1e;
    --jte-border: #d4d4d4;
    --jte-accent: #0066cc;
    --jte-menubar-bg: #f3f3f3;
    --jte-toolbar-bg: #f3f3f3;
    --jte-toolbar-fg: #555;
    --jte-toolbar-hover: #e0e0e0;
    --jte-status-fg: #777;
    --jte-scrollbar-thumb: rgba(0, 0, 0, 0.2);
    --jte-scrollbar-thumb-hover: rgba(0, 0, 0, 0.35);
  }
</style>
