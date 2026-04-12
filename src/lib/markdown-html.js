/** Convert CommonMark-style markdown to HTML. Covers the subset AI models produce. */
export function mdToHtml(md) {
	const lines = md.split("\n");
	const out = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		// Fenced code block
		const fence = line.match(/^```(\w*)/);
		if (fence) {
			const lang = fence[1];
			const code = [];
			i++;
			while (i < lines.length && !lines[i].startsWith("```")) {
				code.push(escHtml(lines[i]));
				i++;
			}
			i++; // skip closing ```
			out.push(`<pre><code${lang ? ` class="language-${lang}"` : ""}>${code.join("\n")}</code></pre>`);
			continue;
		}

		// Heading
		const hm = line.match(/^(#{1,6})\s+(.+)/);
		if (hm) {
			const level = hm[1].length;
			out.push(`<h${level}>${inline(hm[2])}</h${level}>`);
			i++;
			continue;
		}

		// Blockquote
		if (line.startsWith("> ")) {
			const bq = [];
			while (i < lines.length && lines[i].startsWith("> ")) {
				bq.push(lines[i].slice(2));
				i++;
			}
			out.push(`<blockquote><p>${inline(bq.join(" "))}</p></blockquote>`);
			continue;
		}

		// Unordered list
		if (/^[-*]\s/.test(line)) {
			const items = [];
			while (i < lines.length && /^[-*]\s/.test(lines[i])) {
				items.push(`<li>${inline(lines[i].replace(/^[-*]\s+/, ""))}</li>`);
				i++;
			}
			out.push(`<ul>${items.join("")}</ul>`);
			continue;
		}

		// Ordered list
		if (/^\d+\.\s/.test(line)) {
			const items = [];
			while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
				items.push(`<li>${inline(lines[i].replace(/^\d+\.\s+/, ""))}</li>`);
				i++;
			}
			out.push(`<ol>${items.join("")}</ol>`);
			continue;
		}

		// Horizontal rule
		if (/^[-*_]{3,}\s*$/.test(line)) {
			out.push("<hr>");
			i++;
			continue;
		}

		// Blank line
		if (!line.trim()) {
			i++;
			continue;
		}

		// Paragraph — collect consecutive non-empty, non-block lines
		const para = [];
		while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|[-*]\s|\d+\.\s|>\s|```|[-*_]{3,}\s*$)/.test(lines[i])) {
			para.push(lines[i]);
			i++;
		}
		out.push(`<p>${para.map(l => inline(l)).join("<br>")}</p>`);
	}

	return out.join("");
}

/** Process inline markdown: bold, italic, code, links, strikethrough. */
function inline(text) {
	return escHtml(text)
		// Code (must be first to protect contents)
		.replace(/`([^`]+)`/g, "<code>$1</code>")
		// Bold+italic
		.replace(/\*{3}(.+?)\*{3}/g, "<strong><em>$1</em></strong>")
		// Bold
		.replace(/\*{2}(.+?)\*{2}/g, "<strong>$1</strong>")
		.replace(/__(.+?)__/g, "<strong>$1</strong>")
		// Italic
		.replace(/\*(.+?)\*/g, "<em>$1</em>")
		.replace(/_(.+?)_/g, "<em>$1</em>")
		// Strikethrough
		.replace(/~~(.+?)~~/g, "<s>$1</s>")
		// Links
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function escHtml(s) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
