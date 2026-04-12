/** Mode-aware AI action presets for selection transforms. */

export const codeActions = [
	{ id: "explain", label: "Explain", icon: "help", instruction: "Explain what this code does" },
	{ id: "refactor", label: "Refactor", icon: "construction", instruction: "Refactor this code to be cleaner and more idiomatic" },
	{ id: "fix", label: "Fix", icon: "build", instruction: "Fix any bugs in this code" },
	{ id: "addTypes", label: "Add types", icon: "data_object", instruction: "Add type annotations to this code" },
	{ id: "custom", label: "Custom...", icon: "edit" },
];

export const richActions = [
	{ id: "rewrite", label: "Rewrite", icon: "edit_note", instruction: "Rewrite this text to improve clarity and flow" },
	{ id: "simplify", label: "Simplify", icon: "compress", instruction: "Simplify this text, making it more concise" },
	{ id: "expand", label: "Expand", icon: "open_in_full", instruction: "Expand on this text, adding more detail and depth" },
	{ id: "shorten", label: "Shorten", icon: "short_text", instruction: "Make this text shorter while preserving key points" },
	{ id: "custom", label: "Custom...", icon: "edit" },
];

export function getActions(mode) {
	return mode === "plain" ? codeActions : richActions;
}
