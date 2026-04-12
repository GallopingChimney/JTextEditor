/**
 * Builds a context object from editor state for AI provider consumption.
 * The host's ai.prompt() receives this and can use it however it wants.
 */
export function buildContext({ content, selection, cursorOffset, mode, language }) {
	const text = typeof content === "string" ? content : "";
	const before = text.slice(Math.max(0, cursorOffset - 2000), cursorOffset);
	const after = text.slice(cursorOffset, cursorOffset + 500);
	return {
		content: text,
		selection: selection || "",
		cursorOffset,
		before,
		after,
		mode: mode || "plain",
		language: mode === "plain" ? (language || "") : null,
		format: mode === "rich" ? "html" : "text",
	};
}
