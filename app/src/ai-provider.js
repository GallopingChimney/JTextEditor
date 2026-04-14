/**
 * Builds the { transform, generate } ai prop from AI settings.
 * Returns null if provider is "none" or unconfigured.
 */

import { providerPresets } from "../../src/lib/settings-defaults.js";

export function createAiProvider(aiSettings) {
	if (!aiSettings || aiSettings.provider === "none") return null;

	const { provider, apiKey, model } = aiSettings;
	const endpoint = aiSettings.endpoint || providerPresets[provider]?.endpoint || "";
	const modelName = model || providerPresets[provider]?.model || "";

	if (provider !== "ollama" && !apiKey) return null;
	if (!endpoint) return null;

	return {
		transform: (ctx, instruction) => streamRequest(provider, endpoint, apiKey, modelName, buildTransformMessages(ctx, instruction)),
		generate: (ctx, prompt) => streamRequest(provider, endpoint, apiKey, modelName, buildGenerateMessages(ctx, prompt)),
	};
}

function buildTransformMessages(ctx, instruction) {
	const content = ctx.selection || ctx.content;
	return [
		{ role: "system", content: `You are an AI assistant integrated in a text editor. The user is working in ${ctx.mode} mode${ctx.language ? ` (${ctx.language})` : ""}. Respond with only the transformed text — no explanations, no markdown fences unless the content is code.` },
		{ role: "user", content: `${instruction}\n\n${content}` },
	];
}

function buildGenerateMessages(ctx, prompt) {
	return [
		{ role: "system", content: `You are an AI assistant integrated in a text editor. The user is working in ${ctx.mode} mode${ctx.language ? ` (${ctx.language})` : ""}. Generate content based on the user's prompt. Respond with only the generated text — no explanations.` },
		{ role: "user", content: `Context before cursor:\n${ctx.before}\n\nGenerate: ${prompt}` },
	];
}

async function* streamRequest(provider, endpoint, apiKey, model, messages) {
	const { url, headers, body } = buildRequest(provider, endpoint, apiKey, model, messages);

	const response = await fetch(url, {
		method: "POST",
		headers,
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const text = await response.text().catch(() => "");
		throw new Error(`AI request failed (${response.status}): ${text.slice(0, 200)}`);
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop();

		for (const line of lines) {
			const text = parseSSELine(provider, line);
			if (text) yield text;
		}
	}

	if (buffer.trim()) {
		const text = parseSSELine(provider, buffer);
		if (text) yield text;
	}
}

function buildRequest(provider, endpoint, apiKey, model, messages) {
	if (provider === "anthropic") {
		const system = messages.find((m) => m.role === "system")?.content || "";
		const userMessages = messages.filter((m) => m.role !== "system");
		return {
			url: `${endpoint}/v1/messages`,
			headers: {
				"Content-Type": "application/json",
				"x-api-key": apiKey,
				"anthropic-version": "2023-06-01",
				"anthropic-dangerous-direct-browser-access": "true",
			},
			body: { model, max_tokens: 4096, stream: true, system, messages: userMessages },
		};
	}

	if (provider === "ollama") {
		return {
			url: `${endpoint}/api/chat`,
			headers: { "Content-Type": "application/json" },
			body: { model, messages, stream: true },
		};
	}

	// OpenAI-compatible (openai, custom)
	return {
		url: `${endpoint}/chat/completions`,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: { model, messages, stream: true },
	};
}

function parseSSELine(provider, line) {
	if (provider === "ollama") {
		try {
			const data = JSON.parse(line);
			return data.message?.content || "";
		} catch { return ""; }
	}

	// SSE format (Anthropic + OpenAI)
	const trimmed = line.trim();
	if (!trimmed.startsWith("data: ")) return "";
	const payload = trimmed.slice(6);
	if (payload === "[DONE]") return "";

	try {
		const data = JSON.parse(payload);

		// Anthropic format
		if (data.type === "content_block_delta") {
			return data.delta?.text || "";
		}

		// OpenAI format
		if (data.choices?.[0]?.delta?.content) {
			return data.choices[0].delta.content;
		}

		return "";
	} catch { return ""; }
}
