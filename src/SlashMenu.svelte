<script>
	import { slashCommands } from "./lib/tiptap-slash-menu.js";

	let { editor, visible = false, coords = null, query = "" } = $props();

	let menuEl = $state();
	let selectedIndex = $state(0);

	let filtered = $derived.by(() => {
		if (!query) return slashCommands;
		const q = query.toLowerCase();
		return slashCommands.filter(
			(c) => c.label.toLowerCase().includes(q) || c.keywords.includes(q)
		);
	});

	// Reset selection when filter changes
	$effect(() => {
		filtered; // track
		selectedIndex = 0;
	});

	// Position the menu
	let style = $derived.by(() => {
		if (!coords || !visible) return "display:none";
		return `left:${coords.left}px; top:${coords.bottom + 6}px`;
	});

	// Keyboard nav
	export function handleKeydown(e) {
		if (!visible || !filtered.length) return false;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % filtered.length;
			scrollToSelected();
			return true;
		}
		if (e.key === "ArrowUp") {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + filtered.length) % filtered.length;
			scrollToSelected();
			return true;
		}
		if (e.key === "Enter") {
			e.preventDefault();
			execute(filtered[selectedIndex]);
			return true;
		}
		return false;
	}

	function scrollToSelected() {
		requestAnimationFrame(() => {
			const item = menuEl?.querySelector('.jte-slash-item.selected');
			item?.scrollIntoView({ block: 'nearest' });
		});
	}

	function execute(cmd) {
		if (!cmd) return;
		editor?.commands.executeSlashCommand(cmd.id);
	}
</script>

{#if visible && filtered.length > 0}
	<div class="jte-slash" bind:this={menuEl} style={style}>
		{#each filtered as cmd, i}
			<button
				class="jte-slash-item"
				class:selected={i === selectedIndex}
				onpointerdown={(e) => { e.preventDefault(); execute(cmd); }}
				onpointerenter={() => selectedIndex = i}
			>
				<span class="material-symbols-outlined">{cmd.icon}</span>
				<span class="jte-slash-label">{cmd.label}</span>
			</button>
		{/each}
	</div>
{/if}

<style>
	.jte-slash {
		position: fixed;
		min-width: 180px;
		max-height: 280px;
		overflow-y: auto;
		background: var(--jte-menubar-bg, #2a2a2a);
		border: 1px solid var(--jte-border, #444);
		border-radius: 6px;
		padding: 4px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
		z-index: 200;
		user-select: none;
	}

	.jte-slash-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 6px 8px;
		background: transparent;
		border: none;
		color: var(--jte-toolbar-fg, #ccc);
		cursor: pointer;
		font-family: var(--jte-ui-font, system-ui, sans-serif);
		font-size: 13px;
		text-align: left;
		border-radius: 4px;
	}

	.jte-slash-item:hover,
	.jte-slash-item.selected {
		background: var(--jte-toolbar-hover, #3a3a3a);
		color: var(--jte-fg, #d4d4d4);
	}

	.jte-slash-item .material-symbols-outlined {
		font-size: 18px;
		color: var(--jte-status-fg, #888);
	}

	.jte-slash-item.selected .material-symbols-outlined {
		color: var(--jte-accent, #569cd6);
	}

	.jte-slash-label {
		flex: 1;
	}

	.jte-slash::-webkit-scrollbar {
		width: 8px;
	}
	.jte-slash::-webkit-scrollbar-track {
		background: transparent;
	}
	.jte-slash::-webkit-scrollbar-thumb {
		border-radius: 4px;
		background-color: rgba(255, 255, 255, 0.15);
	}
</style>
