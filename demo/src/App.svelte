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

  // Stream Claude API response, yielding text chunks
  async function* streamClaude(messages) {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'your-key-here') {
      yield '[Set VITE_ANTHROPIC_API_KEY in demo/.env to use real AI]';
      return;
    }

    const res = await fetch('/api/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        stream: true,
        messages,
      }),
    });

    if (!res.ok) {
      yield `[API error: ${res.status} ${res.statusText}]`;
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') return;
        try {
          const event = JSON.parse(data);
          if (event.type === 'content_block_delta' && event.delta?.text) {
            yield event.delta.text;
          }
        } catch {}
      }
    }
  }

  // Real AI provider — calls Claude via Vite proxy
  const ai = {
    async *transform(ctx, instruction) {
      const systemMsg = ctx.format === 'html'
        ? 'You are an AI writing assistant. Return only the transformed text, no explanation. Preserve HTML formatting.'
        : 'You are an AI coding assistant. Return only the transformed code, no explanation or markdown fences.';
      yield* streamClaude([
        { role: 'user', content: `${systemMsg}\n\n${instruction}:\n\n${ctx.selection}` },
      ]);
    },
    async *generate(ctx, prompt) {
      const systemMsg = ctx.format === 'html'
        ? 'You are an AI writing assistant. Generate content directly, no explanation.'
        : `You are an AI coding assistant. Generate ${ctx.language || 'code'} directly, no explanation or markdown fences.`;
      const context = ctx.before ? `Context (text before cursor):\n${ctx.before.slice(-500)}\n\n` : '';
      yield* streamClaude([
        { role: 'user', content: `${systemMsg}\n\n${context}Instruction: ${prompt}` },
      ]);
    },
  };

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
    ai={ai}
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
