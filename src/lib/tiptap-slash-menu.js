import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Slash menu extension — listens for "/" at start of line,
 * emits events for the Svelte component to render the popup.
 */

const COMMANDS = [
	{ id: "h1", label: "Heading 1", icon: "format_h1", keywords: "heading title h1" },
	{ id: "h2", label: "Heading 2", icon: "format_h2", keywords: "heading subtitle h2" },
	{ id: "h3", label: "Heading 3", icon: "format_h3", keywords: "heading h3" },
	{ id: "bullet", label: "Bullet List", icon: "format_list_bulleted", keywords: "list unordered bullet" },
	{ id: "ordered", label: "Ordered List", icon: "format_list_numbered", keywords: "list numbered ordered" },
	{ id: "blockquote", label: "Blockquote", icon: "format_quote", keywords: "quote blockquote" },
	{ id: "codeblock", label: "Code Block", icon: "code_blocks", keywords: "code block pre" },
	{ id: "hr", label: "Divider", icon: "horizontal_rule", keywords: "divider horizontal rule line" },
	{ id: "table", label: "Table", icon: "table", keywords: "table grid" },
	{ id: "image", label: "Image", icon: "image", keywords: "image picture photo" },
];

export { COMMANDS as slashCommands };

const pluginKey = new PluginKey("slashMenu");

export const SlashMenu = Extension.create({
	name: "slashMenu",

	addOptions() {
		return {
			onOpen: () => {},
			onClose: () => {},
			onFilter: () => {},
		};
	},

	addProseMirrorPlugins() {
		const ext = this;
		return [
			new Plugin({
				key: pluginKey,
				state: {
					init: () => ({ active: false, range: null, query: "" }),
					apply(tr, prev, _oldState, newState) {
						const meta = tr.getMeta(pluginKey);
						if (meta?.close) return { active: false, range: null, query: "" };

						const { selection } = newState;
						if (!selection.empty) {
							if (prev.active) ext.options.onClose();
							return { active: false, range: null, query: "" };
						}

						const $pos = selection.$from;
						const textBefore = $pos.parent.textBetween(0, $pos.parentOffset, null, "\ufffc");

						const match = textBefore.match(/\/(\w*)$/);
						if (match) {
							const from = $pos.start() + match.index;
							const to = $pos.pos;
							const query = match[1] || "";

							if (!prev.active) {
								// Get coords for positioning
								const coords = ext.editor.view.coordsAtPos(from);
								ext.options.onOpen(coords);
							}
							ext.options.onFilter(query);
							return { active: true, range: { from, to }, query };
						}

						if (prev.active) ext.options.onClose();
						return { active: false, range: null, query: "" };
					},
				},
			}),
		];
	},

	addCommands() {
		return {
			executeSlashCommand:
				(id) =>
				({ editor, state }) => {
					// Delete the slash + query text
					const pluginState = pluginKey.getState(state);
					if (pluginState?.range) {
						editor.chain()
							.focus()
							.deleteRange(pluginState.range)
							.run();
					}

					// Close the menu
					editor.view.dispatch(
						editor.view.state.tr.setMeta(pluginKey, { close: true })
					);

					// Execute the command
					switch (id) {
						case "h1": editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
						case "h2": editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
						case "h3": editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
						case "bullet": editor.chain().focus().toggleBulletList().run(); break;
						case "ordered": editor.chain().focus().toggleOrderedList().run(); break;
						case "blockquote": editor.chain().focus().toggleBlockquote().run(); break;
						case "codeblock": editor.chain().focus().toggleCodeBlock().run(); break;
						case "hr": editor.chain().focus().setHorizontalRule().run(); break;
						case "table": editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); break;
						case "image": {
							const url = prompt("Image URL:");
							if (url) editor.chain().focus().setImage({ src: url }).run();
							break;
						}
					}
					return true;
				},
		};
	},

	addKeyboardShortcuts() {
		return {
			Escape: ({ editor }) => {
				const pluginState = pluginKey.getState(editor.state);
				if (pluginState?.active) {
					editor.view.dispatch(
						editor.view.state.tr.setMeta(pluginKey, { close: true })
					);
					this.options.onClose();
					return true;
				}
				return false;
			},
		};
	},
});
