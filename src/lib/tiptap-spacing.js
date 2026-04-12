import { Extension } from "@tiptap/core";

export const Spacing = Extension.create({
	name: "spacing",

	addOptions() {
		return {
			types: ["heading", "paragraph"],
		};
	},

	addGlobalAttributes() {
		return [{
			types: this.options.types,
			attributes: {
				lineHeight: {
					default: null,
					parseHTML: (el) => el.style.lineHeight || null,
					renderHTML: (attrs) => {
						if (!attrs.lineHeight) return {};
						return { style: `line-height: ${attrs.lineHeight}` };
					},
				},
				spacingBefore: {
					default: null,
					parseHTML: (el) => el.style.marginTop || null,
					renderHTML: (attrs) => {
						if (!attrs.spacingBefore) return {};
						return { style: `margin-top: ${attrs.spacingBefore}` };
					},
				},
				spacingAfter: {
					default: null,
					parseHTML: (el) => el.style.marginBottom || null,
					renderHTML: (attrs) => {
						if (!attrs.spacingAfter) return {};
						return { style: `margin-bottom: ${attrs.spacingAfter}` };
					},
				},
			},
		}];
	},

	addCommands() {
		const types = this.options.types;

		const setAttr = (attr, value) => ({ tr, state, dispatch }) => {
			if (dispatch) {
				const { from, to } = state.selection;
				state.doc.nodesBetween(from, to, (node, pos) => {
					if (types.includes(node.type.name)) {
						tr.setNodeMarkup(pos, undefined, { ...node.attrs, [attr]: value });
					}
				});
			}
			return true;
		};

		return {
			setLineHeight: (height) => setAttr("lineHeight", String(height)),
			unsetLineHeight: () => setAttr("lineHeight", null),
			setSpacingBefore: (value) => setAttr("spacingBefore", value),
			unsetSpacingBefore: () => setAttr("spacingBefore", null),
			setSpacingAfter: (value) => setAttr("spacingAfter", value),
			unsetSpacingAfter: () => setAttr("spacingAfter", null),
		};
	},
});
