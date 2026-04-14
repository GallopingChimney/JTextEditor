/** Default settings and AI provider presets for JTextEditor. */

export const editorDefaults = {
	showInvisibles: false,
	showLineNumbers: true,
	wordWrap: false,
	highlightLine: true,
	showIndentGuides: true,
	theme: "dark",
	pageWidth: "normal",
	bgColor: "",
	pageColor: "",
	fontFamily: "Consolas, 'Courier New', monospace",
	fontSize: "14px",
	tabSize: 4,
	lineHeight: "1.5",
	defaultMode: "rich",
	toolbarMode: "pinned",
};

export const aiDefaults = {
	provider: "none",
	endpoint: "",
	apiKey: "",
	model: "",
};

export const providerPresets = {
	anthropic: { endpoint: "https://api.anthropic.com", model: "claude-sonnet-4-20250514" },
	openai: { endpoint: "https://api.openai.com/v1", model: "gpt-4o" },
	ollama: { endpoint: "http://localhost:11434", model: "llama3" },
	custom: { endpoint: "", model: "" },
};

export const fontSizes = ["10", "12", "13", "14", "16", "18", "20", "24"];

export const lineHeights = [
	{ label: "Tight", value: "1.2" },
	{ label: "Normal", value: "1.5" },
	{ label: "Relaxed", value: "1.8" },
	{ label: "Loose", value: "2" },
];
