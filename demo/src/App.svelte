<script>
  import { JTextEditor } from '../../src/index.js';

  let editor;

  const sampleTabs = [
    {
      id: 'demo-js',
      name: 'demo.js',
      language: 'js',
      path: 'src/demo.js',
      content: `// JTextEditor demo
function greet(name) {
  const message = "Hello, " + name + "!";
  console.log(message);
  return message;
}

const items = [1, 2, 3].map(x => x * 2);

if (items.length > 0) {
  greet("world");
}
`,
    },
    {
      id: 'demo-py',
      name: 'app.py',
      language: 'py',
      path: 'backend/app.py',
      content: `# Python example
def fibonacci(n):
    """Generate fibonacci sequence."""
    a, b = 0, 1
    for i in range(n):
        yield a
        a, b = b, a + b

for num in fibonacci(10):
    print(f"fib: {num}")

class Parser:
    def __init__(self, source):
        self.source = source
        self.pos = 0

    def parse(self):
        return self.source[self.pos:]
`,
    },
  ];

  async function handleOpen() {
    try {
      if ('showOpenFilePicker' in window) {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'Text files', accept: { 'text/*': ['.txt', '.js', '.ts', '.py', '.json', '.html', '.css', '.md', '.yaml', '.yml', '.toml', '.rs', '.go', '.java', '.c', '.cpp', '.h', '.rb', '.php', '.swift', '.kt', '.lua', '.sql', '.sh', '.ini', '.xml', '.diff'] } }],
          multiple: false,
        });
        const file = await handle.getFile();
        const content = await file.text();
        const ext = file.name.split('.').pop() || '';
        editor.openFile({ name: file.name, content, language: ext, path: file.name });
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = async () => {
          const file = input.files[0];
          if (!file) return;
          const content = await file.text();
          const ext = file.name.split('.').pop() || '';
          editor.openFile({ name: file.name, content, language: ext, path: file.name });
        };
        input.click();
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error('Open failed:', e);
    }
  }

  async function handleSave(tab) {
    try {
      if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({ suggestedName: tab.name });
        const writable = await handle.createWritable();
        await writable.write(tab.content);
        await writable.close();
        editor.markSaved(handle.name);
      } else {
        const blob = new Blob([tab.content], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = tab.name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error('Save failed:', e);
    }
  }
</script>

<div class="app">
  <JTextEditor
    bind:this={editor}
    tabs={sampleTabs}
    onsave={handleSave}
    onsaveAs={handleSave}
    onopen={handleOpen}
  />
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: #1e1e1e;
  }
  .app {
    width: 100vw;
    height: 100vh;
  }
</style>
