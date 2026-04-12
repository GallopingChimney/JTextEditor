<script>
	let { visible = false, coords = null, hasSelection = false, onsubmit, oncancel } = $props();

	let inputEl = $state();
	let promptEl = $state();
	let value = $state("");
	let replace = $state(false);

	// Module-level history persists across open/close and component remounts
	const history = [];
	let historyIndex = $state(-1);
	let draft = $state("");

	$effect(() => {
		if (visible && inputEl) {
			value = "";
			historyIndex = -1;
			draft = "";
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	function submit() {
		const text = value.trim();
		if (!text) return;
		if (!history.length || history[history.length - 1] !== text) {
			history.push(text);
		}
		onsubmit?.(text, { replace });
	}

	function handleKeydown(e) {
		if (e.key === "Enter" && value.trim()) {
			e.preventDefault();
			submit();
		} else if (e.key === "Escape") {
			e.preventDefault();
			oncancel?.();
		} else if (e.key === "ArrowUp" && history.length) {
			e.preventDefault();
			if (historyIndex === -1) {
				draft = value;
				historyIndex = history.length - 1;
			} else if (historyIndex > 0) {
				historyIndex--;
			}
			value = history[historyIndex];
		} else if (e.key === "ArrowDown" && historyIndex !== -1) {
			e.preventDefault();
			if (historyIndex < history.length - 1) {
				historyIndex++;
				value = history[historyIndex];
			} else {
				historyIndex = -1;
				value = draft;
			}
		}
	}

	function handleBlur() {
		requestAnimationFrame(() => {
			if (!promptEl?.contains(document.activeElement)) {
				oncancel?.();
			}
		});
	}
</script>

{#if visible && coords}
	<div class="jte-ai-prompt" style="left:{coords.x}px;top:{coords.y}px" bind:this={promptEl}>
		<span class="material-symbols-outlined jte-ai-prompt-icon">auto_awesome</span>
		<input
			bind:this={inputEl}
			bind:value
			class="jte-ai-prompt-input"
			placeholder="Ask AI..."
			onkeydown={handleKeydown}
			onblur={handleBlur}
		/>
		{#if hasSelection}
			<button
				class="jte-ai-prompt-btn jte-ai-mode-btn"
				class:active={replace}
				title={replace ? "Replace selection" : "Insert below selection"}
				onmousedown={(e) => e.preventDefault()}
				onclick={() => replace = !replace}
			>
				<span class="material-symbols-outlined">{replace ? "find_replace" : "move_down"}</span>
			</button>
		{/if}
		<button
			class="jte-ai-prompt-btn"
			title="Send"
			onmousedown={(e) => e.preventDefault()}
			onclick={submit}
		>
			<span class="material-symbols-outlined">arrow_upward</span>
		</button>
	</div>
{/if}

<style>
	.jte-ai-prompt {
		position: fixed;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		background: var(--jte-menubar-bg, #2a2a2a);
		border: 1px solid var(--jte-accent, #569cd6);
		border-radius: 8px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
		z-index: 200;
		min-width: 280px;
	}

	.jte-ai-prompt-icon {
		font-size: 14px;
		color: var(--jte-accent, #569cd6);
		flex-shrink: 0;
	}

	.jte-ai-prompt-input {
		flex: 1;
		background: transparent;
		border: none;
		color: var(--jte-fg, #d4d4d4);
		font-family: var(--jte-ui-font, system-ui, sans-serif);
		font-size: 13px;
		outline: none;
		padding: 4px 0;
	}

	.jte-ai-prompt-input::placeholder {
		color: var(--jte-status-fg, #666);
	}

	.jte-ai-prompt-btn {
		display: flex;
		align-items: center;
		background: transparent;
		border: none;
		color: var(--jte-toolbar-fg, #aaa);
		cursor: pointer;
		padding: 2px;
		border-radius: 4px;
		line-height: 1;
	}

	.jte-ai-prompt-btn:hover {
		color: var(--jte-fg, #d4d4d4);
	}

	.jte-ai-prompt-btn .material-symbols-outlined {
		font-size: 16px;
	}

	.jte-ai-mode-btn.active {
		color: var(--jte-accent, #569cd6);
	}
</style>
