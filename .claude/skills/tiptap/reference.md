# Tiptap 3 Reference — JTextEditor Integration

## Installed Version & Packages

Tiptap v3.22.3 — ProseMirror-based rich text editor framework.

### Installed Extensions
```
@tiptap/core                    — Editor class, Extension/Node/Mark factories
@tiptap/pm                      — ProseMirror re-exports (state, view, model, transform, commands)
@tiptap/starter-kit             — Bundle: bold, italic, strike, underline, code, heading, paragraph,
                                  blockquote, bulletList, orderedList, listItem, listKeymap, codeBlock,
                                  hardBreak, horizontalRule, dropcursor, gapcursor, document, text,
                                  undoRedo, link
@tiptap/extension-bubble-menu   — Floating selection toolbar (uses @floating-ui/dom)
@tiptap/extension-text-style    — TextStyle mark + Color, FontFamily, FontSize, BackgroundColor, LineHeight
@tiptap/extension-text-align    — Block-level text alignment
@tiptap/extension-highlight     — Text highlighting mark
@tiptap/extension-underline     — Underline mark
@tiptap/extension-link          — Hyperlink mark with autolink + paste detection
@tiptap/extension-image         — Block/inline image node with optional resize
@tiptap/extension-table         — Table + TableRow + TableCell + TableHeader (re-exported from single pkg)
@tiptap/extension-placeholder   — CSS-based placeholder text
@tiptap/extension-typography    — Smart quotes, em dash, ellipsis, arrows, etc.
@tiptap/extension-color         — (re-exported from text-style, kept for compat)
@tiptap/extension-font-family   — (re-exported from text-style, kept for compat)
```

---

## Core API

### Editor Constructor
```javascript
new Editor({
  element: HTMLElement,          // Mount target
  content: string | JSON,        // Initial content (HTML or JSON)
  extensions: Extension[],       // Array of configured extensions
  editable: boolean,             // Default true
  autofocus: 'start' | 'end' | 'all' | number | boolean | null,
  editorProps: EditorProps,      // ProseMirror EditorProps passthrough
  parseOptions: ParseOptions,    // ProseMirror parse options

  // Event callbacks
  onBeforeCreate: ({ editor }) => void,
  onCreate: ({ editor }) => void,
  onUpdate: ({ editor, transaction }) => void,
  onSelectionUpdate: ({ editor, transaction }) => void,
  onTransaction: ({ editor, transaction }) => void,
  onFocus: ({ editor, event, transaction }) => void,
  onBlur: ({ editor, event, transaction }) => void,
  onDestroy: () => void,
  onPaste: (event, slice) => void,
  onDrop: (event, slice, moved) => void,
  onDelete: ({ editor, type, node, deletedRange }) => void,

  // Content validation
  enableContentCheck: boolean,
  emitContentError: boolean,
})
```

### Editor Instance Methods
```javascript
// Content
editor.getHTML()                          // → string
editor.getJSON()                          // → JSONContent
editor.getText({ blockSeparator? })       // → string
editor.isEmpty                            // → boolean

// Commands
editor.commands.setContent(content, emitUpdate?)
editor.chain().focus().toggleBold().run() // Chained execution
editor.can().toggleBold()                 // Check if command possible

// State
editor.isActive(name, attrs?)             // Is node/mark active at cursor?
editor.getAttributes(nameOrType)          // Get attributes of active node/mark
editor.isEditable                         // Current edit state
editor.isFocused                          // Focus state
editor.view                               // ProseMirror EditorView
editor.state                              // ProseMirror EditorState
editor.schema                             // ProseMirror Schema

// Lifecycle
editor.setEditable(boolean)
editor.setOptions(Partial<EditorOptions>)
editor.destroy()

// Plugins
editor.registerPlugin(plugin, handlePlugins?)
editor.unregisterPlugin(nameOrKey)
```

### Extension Factory Pattern
```javascript
Extension.create({
  name: 'myExtension',
  addOptions: () => ({ /* defaults */ }),
  addStorage: () => ({ /* mutable state */ }),
  addGlobalAttributes: () => [{ types: [...], attributes: { ... } }],
  addCommands: () => ({ cmd: () => ({ chain, state, dispatch }) => boolean }),
  addKeyboardShortcuts: () => ({ 'Mod-b': () => this.editor.commands.toggleBold() }),
  addInputRules: () => [InputRule],
  addPasteRules: () => [PasteRule],
  addProseMirrorPlugins: () => [Plugin],
  addExtensions: () => [Extension],   // Bundle sub-extensions

  // Lifecycle
  onBeforeCreate, onCreate, onUpdate, onSelectionUpdate,
  onTransaction, onFocus, onBlur, onDestroy,

  // Advanced
  dispatchTransaction: ({ transaction, next }) => void,
  transformPastedHTML: (html) => string,
})

Node.create({
  ...Extension.create fields,
  group: 'block' | 'inline',
  content: 'text*' | 'block+' | etc,
  marks: '' | '_' | 'bold italic',
  atom: boolean,
  inline: boolean,
  code: boolean,
  defining: boolean,
  addAttributes: () => ({ attr: { default, parseHTML, renderHTML, keepOnSplit } }),
  parseHTML: () => [{ tag: 'div', ... }],
  renderHTML: ({ HTMLAttributes }) => ['div', HTMLAttributes, 0],
  addNodeView: () => NodeViewRenderer,
})

Mark.create({
  ...Extension.create fields,
  inclusive: boolean,
  excludes: string,
  exitable: boolean,
  spanning: boolean,
  code: boolean,
  addAttributes, parseHTML, renderHTML,
  addMarkView: () => MarkViewRenderer,
})
```

### Extension Customization
```javascript
// Configure options (returns new instance)
Extension.configure({ option: value })

// Extend behavior (returns new class)
Extension.extend({
  addCommands() {
    return { ...this.parent?.(), myNewCommand: () => ({ ... }) }
  }
})
```

---

## Extension API Reference

### StarterKit
```javascript
StarterKit.configure({
  bold: false | Partial<BoldOptions>,
  italic: false | Partial<ItalicOptions>,
  strike: false | Partial<StrikeOptions>,
  underline: false | Partial<UnderlineOptions>,
  code: false | Partial<CodeOptions>,
  heading: false | { levels: [1, 2, 3] },
  paragraph: false | Partial<ParagraphOptions>,
  blockquote: false | Partial<BlockquoteOptions>,
  bulletList: false | Partial<BulletListOptions>,
  orderedList: false | Partial<OrderedListOptions>,
  listItem: false | Partial<ListItemOptions>,
  listKeymap: false | Partial<ListKeymapOptions>,
  codeBlock: false | Partial<CodeBlockOptions>,
  hardBreak: false | Partial<HardBreakOptions>,
  horizontalRule: false | Partial<HorizontalRuleOptions>,
  dropcursor: false | Partial<DropcursorOptions>,
  gapcursor: false,
  document: false,
  text: false,
  undoRedo: false | Partial<UndoRedoOptions>,
  link: false | Partial<LinkOptions>,
})
```

### BubbleMenu
```javascript
BubbleMenu.configure({
  element: HTMLElement | null,
  pluginKey: PluginKey | string,
  shouldShow: ({ editor, view, state, oldState, from, to }) => boolean,
  updateDelay: number,              // Default: 250ms
  resizeDelay: number,              // Default: 60ms
  appendTo: HTMLElement | (() => HTMLElement),
  options: {                        // @floating-ui/dom options
    strategy: 'absolute' | 'fixed',
    placement: 'top' | 'bottom' | 'left' | 'right' | ...,
    offset: OffsetOptions | boolean,
    flip: FlipOptions | boolean,
    shift: ShiftOptions | boolean,
    onShow: () => void,
    onHide: () => void,
  },
})
```

### TextStyle + Companions (from @tiptap/extension-text-style)
```javascript
// TextStyle — base mark that other extensions attach attributes to
TextStyle.configure({ mergeNestedSpanStyles: true })
// Commands: removeEmptyTextStyle(), toggleTextStyle(attrs?)

// Color — adds `color` attribute to TextStyle
Color.configure({ types: ['textStyle'] })
// Commands: setColor(color), unsetColor()

// FontFamily — adds `fontFamily` attribute to TextStyle
FontFamily.configure({ types: ['textStyle'] })
// Commands: setFontFamily(family), unsetFontFamily()

// FontSize — adds `fontSize` attribute to TextStyle
FontSize.configure({ types: ['textStyle'] })
// Commands: setFontSize(size), unsetFontSize()

// BackgroundColor — adds `backgroundColor` attribute to TextStyle
// Commands: setBackgroundColor(color), unsetBackgroundColor()

// LineHeight — adds `lineHeight` attribute
// Commands: setLineHeight(height), unsetLineHeight()

// TextStyleKit — bundles all above
```

### TextAlign
```javascript
TextAlign.configure({
  types: ['heading', 'paragraph'],  // Which node types
  alignments: ['left', 'center', 'right', 'justify'],
  defaultAlignment: null,
})
// Commands: setTextAlign(align), unsetTextAlign(), toggleTextAlign(align)
```

### Highlight
```javascript
Highlight.configure({
  multicolor: boolean,  // Allow per-highlight colors
})
// Commands: setHighlight({ color? }), toggleHighlight({ color? }), unsetHighlight()
```

### Link
```javascript
Link.configure({
  autolink: true,
  protocols: [],                // Custom protocol schemes
  defaultProtocol: 'http',
  openOnClick: true | 'whenNotEditable',
  linkOnPaste: true,
  HTMLAttributes: {},
  isAllowedUri: (url, ctx) => boolean,  // XSS validation
  shouldAutoLink: (url) => boolean,
})
// Commands: setLink({ href, target?, rel?, class?, title? }), toggleLink(...), unsetLink()
```

### Image
```javascript
Image.configure({
  inline: false,
  allowBase64: false,
  HTMLAttributes: {},
  resize: false | {
    enabled: true,
    directions: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'],
    minWidth: number,
    minHeight: number,
    alwaysPreserveAspectRatio: boolean,
  },
})
// Commands: setImage({ src, alt?, title?, width?, height? })
```

### Table (re-exports TableRow, TableCell, TableHeader)
```javascript
Table.configure({
  resizable: false,
  handleWidth: 5,
  cellMinWidth: 25,
  lastColumnResizable: true,
  allowTableNodeSelection: false,
})
// Commands:
//   insertTable({ rows?, cols?, withHeaderRow? })
//   addColumnBefore(), addColumnAfter(), deleteColumn()
//   addRowBefore(), addRowAfter(), deleteRow()
//   deleteTable()
//   mergeCells(), splitCell(), mergeOrSplit()
//   toggleHeaderColumn(), toggleHeaderRow(), toggleHeaderCell()
//   setCellAttribute(name, value)
//   goToNextCell(), goToPreviousCell()
//   fixTables()
//   setCellSelection({ anchorCell, headCell? })
```

### Placeholder
```javascript
Placeholder.configure({
  placeholder: 'Write something...' | ((props) => string),
  emptyEditorClass: 'is-editor-empty',
  emptyNodeClass: 'is-empty',
  showOnlyWhenEditable: true,
  showOnlyCurrent: true,
  includeChildren: false,
})
```
Works via CSS data attributes + `::before` pseudo-elements.

### Typography
```javascript
Typography.configure({
  emDash: '—',           // -- → —
  ellipsis: '…',         // ... → …
  openDoubleQuote: '"',  // Smart quotes
  closeDoubleQuote: '"',
  leftArrow: '←',       // <- → ←
  rightArrow: '→',      // -> → →
  copyright: '©',       // (c) → ©
  trademark: '™',       // (tm) → ™
  // ... 20+ rules, each can be false to disable
})
```

---

## ProseMirror Integration (@tiptap/pm)

Re-exports from ProseMirror packages:

```javascript
import { EditorState, Plugin, PluginKey, Transaction, Selection, TextSelection } from '@tiptap/pm/state';
import { EditorView, Decoration, DecorationSet } from '@tiptap/pm/view';
import { Node, Mark, Schema, Fragment, Slice, ResolvedPos } from '@tiptap/pm/model';
import { Transform } from '@tiptap/pm/transform';
// Also: /commands, /schema-list, /gapcursor, /dropcursor, /history,
//       /inputrules, /keymap, /markdown, /tables
```

### Custom ProseMirror Plugins in Tiptap
```javascript
Extension.create({
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('myPlugin'),
        state: {
          init: () => initialState,
          apply: (tr, prev, oldState, newState) => newState,
        },
        props: {
          handleKeyDown: (view, event) => boolean,
          decorations: (state) => DecorationSet,
        },
        view: () => ({
          update: (view, prevState) => {},
          destroy: () => {},
        }),
      }),
    ];
  },
})
```

### Custom NodeView (used by CodeBlockCM)
```javascript
Node.create({
  addNodeView() {
    return ({ node, view, getPos, decorations, innerDecorations }) => ({
      dom: HTMLElement,              // Outer DOM element
      contentDOM?: HTMLElement,      // Where ProseMirror renders content
      update(node, decorations, innerDecos) => boolean,
      selectNode() => void,
      deselectNode() => void,
      setSelection(anchor, head) => void,
      stopEvent(event) => boolean,   // Prevent PM from handling event
      ignoreMutation(record) => boolean,
      destroy() => void,
    });
  },
})
```

---

## Key Tiptap 3 Patterns

### Command Chain Pattern
```javascript
// Always use chain() for multi-step operations
editor.chain()
  .focus()                          // Ensure editor focused
  .toggleBold()                     // Toggle mark
  .run()                            // Execute (returns boolean)

// Check capability
editor.can().chain().focus().toggleBold().run()  // → boolean
```

### Active State Detection
```javascript
editor.isActive('bold')                           // Mark active?
editor.isActive('heading', { level: 1 })          // Node with attrs?
editor.isActive({ textAlign: 'center' })          // Attribute check
editor.getAttributes('textStyle')                  // { color, fontSize, ... }
```

### Extension Storage
```javascript
Extension.create({
  name: 'counter',
  addStorage: () => ({ count: 0 }),
  onUpdate() {
    this.storage.count++;
    // Access from outside: editor.extensionStorage.counter.count
  },
})
```

### v3 Import Pattern (consolidated packages)
```javascript
// TextStyle ecosystem — all from one package
import { TextStyle, Color, FontFamily, FontSize, BackgroundColor, LineHeight } from '@tiptap/extension-text-style';

// Table ecosystem — all from one package
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';

// StarterKit now includes Link and Underline
StarterKit.configure({ link: false })  // Disable if using separate Link config
```

### Content Sync (Svelte 5 integration)
```javascript
// CRITICAL: lastEmitted guard prevents infinite loops
let lastEmitted = "";

// Mount with untrack() to avoid tracking content prop
$effect(() => {
  if (!editorEl) return;
  const initialContent = untrack(() => content);
  editor = new Editor({ element: editorEl, content: initialContent, ... });
  return () => editor?.destroy();
});

// Sync from parent (tab switch)
$effect(() => {
  const c = content;  // Track prop
  if (c !== lastEmitted && c !== editor.getHTML()) {
    editor.commands.setContent(c || "", false);
    lastEmitted = c;
  }
});

// Emit changes
onUpdate: ({ editor: ed }) => {
  lastEmitted = ed.getHTML();
  onchange?.(lastEmitted);
}
```
