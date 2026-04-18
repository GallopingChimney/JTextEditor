<script lang="ts">
	import { getIcon, type Icon } from 'material-file-icons';
	import { TreeState, type TreeNode, type FlatRow } from './TreeState.svelte.ts';

	// --- Props ---

	let {
		tree,
		width = 240,
		onfileopen,
		onrequestdelete,
	}: {
		tree: TreeState;
		width?: number;
		onfileopen?: (node: TreeNode) => void;
		onrequestdelete?: (node: TreeNode) => void;
	} = $props();

	// --- File icons (extensible) ---

	const CUSTOM_ICONS: Icon[] = [];

	function fileIconSvg(filename: string): string {
		const ext = filename.split('.').pop()?.toLowerCase() ?? '';
		const custom = CUSTOM_ICONS.find(i => i.extensions?.includes(ext));
		return (custom ?? getIcon(filename)).svg;
	}

	// --- Root inline edit ---

	let editingRoot = $state(false);
	let rootInput = $state('');

	function startEditRoot() {
		rootInput = tree.root;
		editingRoot = true;
	}

	function commitRoot() {
		const v = rootInput.trim();
		if (v) tree.setRoot(v);
		editingRoot = false;
	}

	// --- Svelte action: auto-focus + select ---

	function autoFocus(el: HTMLInputElement) {
		setTimeout(() => { el.focus(); el.select(); }, 0);
	}

	// --- Virtualization ---

	const OVERSCAN = 5;

	let rowH = $state(22);
	let scrollTop = $state(0);
	let viewportH = $state(0);
	let scrollEl: HTMLDivElement | undefined = $state();

	function onScroll(e: Event) {
		const el = e.currentTarget as HTMLElement;
		scrollTop = el.scrollTop;
		viewportH = el.clientHeight;
	}

	function measure() {
		if (!scrollEl) return;
		viewportH = scrollEl.clientHeight;
		const row = scrollEl.querySelector<HTMLElement>('[data-node-id]');
		if (row) rowH = row.offsetHeight;
	}
	$effect(() => { if (scrollEl) measure(); });

	const virt = $derived.by(() => {
		const count = tree.flatRows.length;
		const totalH = count * rowH;
		const start = Math.max(0, Math.floor(scrollTop / rowH) - OVERSCAN);
		const end = Math.min(count, Math.ceil((scrollTop + viewportH) / rowH) + OVERSCAN + 1);
		return { start, end, offsetY: start * rowH, totalH };
	});

	function scrollToSelected() {
		if (!tree.selected || !scrollEl) return;
		const idx = tree.flatRows.findIndex(r => r.node.id === tree.selected);
		if (idx === -1) return;
		const rowTop = idx * rowH;
		const rowBot = rowTop + rowH;
		if (rowTop < scrollEl.scrollTop) scrollEl.scrollTop = rowTop;
		else if (rowBot > scrollEl.scrollTop + viewportH) scrollEl.scrollTop = rowBot - viewportH;
	}

	// --- Keyboard ---

	function onKeydown(e: KeyboardEvent) {
		if (tree.editing) {
			if (e.key === 'Enter') { e.preventDefault(); tree.commitEdit(); }
			else if (e.key === 'Escape') { e.preventDefault(); tree.cancelEdit(); }
			return;
		}
		if (editingRoot) {
			if (e.key === 'Enter') { e.preventDefault(); commitRoot(); }
			else if (e.key === 'Escape') { e.preventDefault(); editingRoot = false; }
			return;
		}

		if (!tree.selected && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
			const rows = tree.flatRows;
			if (rows.length) tree.select(rows[0].node.id);
			e.preventDefault();
			return;
		}
		if (!tree.selected) return;

		const node = tree.find(tree.selected);
		if (!node) return;

		switch (e.key) {
			case 'ArrowDown':
			case 'ArrowUp': {
				e.preventDefault();
				const rows = tree.flatRows;
				const i = rows.findIndex(r => r.node.id === tree.selected);
				const next = i + (e.key === 'ArrowDown' ? 1 : -1);
				if (next >= 0 && next < rows.length) {
					tree.select(rows[next].node.id);
					scrollToSelected();
				}
				break;
			}
			case 'ArrowRight':
				if (node.type === 'folder' && !tree.expanded.has(node.id)) {
					e.preventDefault();
					tree.toggle(node.id);
				}
				break;
			case 'ArrowLeft':
				if (node.type === 'folder' && tree.expanded.has(node.id)) {
					e.preventDefault();
					tree.toggle(node.id);
				}
				break;
			case 'Enter':
				if (node.type === 'folder') {
					e.preventDefault();
					tree.toggle(node.id);
				} else if (onfileopen) {
					e.preventDefault();
					onfileopen(node);
				}
				break;
			case 'F2':
				e.preventDefault();
				tree.startRename(tree.selected);
				break;
			case 'Delete': {
				e.preventDefault();
				const del = tree.find(tree.selected);
				if (del) (onrequestdelete ?? ((n) => tree.remove(n.id)))(del);
				break;
			}
		}
	}

	// --- Drag & drop (pointer events) ---

	let drag = $state<{
		nodeId: string;
		startX: number;
		startY: number;
		x: number;
		y: number;
		active: boolean;
	} | null>(null);

	let dropTarget = $state<{ id: string | null; valid: boolean } | null>(null);
	let dragError = $state<string | null>(null);

	function onDragStart(e: PointerEvent, nodeId: string) {
		if (tree.editing) return;
		drag = { nodeId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, active: false };
	}

	function onPointerMove(e: PointerEvent) {
		if (!drag) return;
		drag.x = e.clientX;
		drag.y = e.clientY;
		if (!drag.active) {
			if (Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) > 3) {
				drag.active = true;
			} else return;
		}
		const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-node-id]');
		if (!el) {
			const treeBody = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-tree-body]');
			dropTarget = treeBody ? { id: null, valid: true } : null;
			return;
		}
		const targetId = el.dataset.nodeId!;
		const targetNode = tree.find(targetId);
		if (!targetNode || targetNode.type !== 'folder' || targetId === drag.nodeId) {
			dropTarget = { id: targetId, valid: false };
		} else {
			const err = tree._isDescendant(targetId, drag.nodeId);
			dropTarget = { id: targetId, valid: !err };
		}
	}

	function onPointerUp() {
		if (drag?.active && dropTarget?.valid) {
			const targetId = dropTarget.id;
			const err = tree.move(drag.nodeId, targetId ?? null);
			if (err) {
				dragError = err;
				setTimeout(() => dragError = null, 2000);
			}
		}
		drag = null;
		dropTarget = null;
	}
</script>

<svelte:window onpointermove={onPointerMove} onpointerup={onPointerUp} onresize={measure} />

<!-- Drag ghost -->
{#if drag?.active}
	{@const node = tree.find(drag.nodeId)}
	{#if node}
		<div
			class="fixed pointer-events-none z-50 flex items-center gap-1 px-2 py-0.5 rounded text-xs
				bg-neutral-800 border border-neutral-600 shadow-lg text-neutral-200"
			style="left:{drag.x + 12}px; top:{drag.y - 8}px;"
		>
			{#if node.type === 'folder'}
				<span class="material-symbols-outlined text-[14px] text-yellow-500/60">folder</span>
			{:else}
				<span class="w-3.5 h-3.5 shrink-0">{@html fileIconSvg(node.name)}</span>
			{/if}
			{node.name}
		</div>
	{/if}
{/if}

<!-- Error toast -->
{#if dragError}
	<div class="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded bg-red-900/90 border border-red-500/40
		text-xs text-red-200 shadow-lg">
		{dragError}
	</div>
{/if}

<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<div
	class="flex flex-col h-full bg-neutral-900 text-neutral-200 select-none overflow-hidden"
	style="width:{width}px;"
	role="tree"
	onkeydown={onKeydown}
>
	<!-- Header (VSCode-style) -->
	<div class="flex items-center h-5.5 px-2 shrink-0 group/hdr">
		{#if editingRoot}
			<input
				class="flex-1 bg-neutral-800 text-[11px] text-neutral-100 px-1.5 h-4.5 rounded outline-none border border-blue-500/60"
				bind:value={rootInput}
				use:autoFocus
				onblur={commitRoot}
			/>
		{:else}
			<span class="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide truncate flex-1">{tree.root}</span>
			<div class="flex items-center gap-0.5 opacity-0 group-hover/hdr:opacity-100 transition-opacity">
				<button
					class="p-0.5 rounded hover:bg-white/10 text-neutral-500 hover:text-neutral-200"
					title="Set root"
					onclick={startEditRoot}
				>
					<span class="material-symbols-outlined text-[16px]">edit</span>
				</button>
				<button
					class="p-0.5 rounded hover:bg-white/10 text-neutral-500 hover:text-neutral-200"
					title="New File"
					onclick={() => tree.addFile()}
				>
					<span class="material-symbols-outlined text-[16px]">note_add</span>
				</button>
				<button
					class="p-0.5 rounded hover:bg-white/10 text-neutral-500 hover:text-neutral-200"
					title="New Folder"
					onclick={() => tree.addFolder()}
				>
					<span class="material-symbols-outlined text-[16px]">create_new_folder</span>
				</button>
				<button
					class="p-0.5 rounded hover:bg-white/10 text-neutral-500 hover:text-neutral-200"
					title="Collapse All"
					onclick={() => tree.collapseAll()}
				>
					<span class="material-symbols-outlined text-[16px]">unfold_less</span>
				</button>
			</div>
		{/if}
	</div>

	<!-- Tree body (virtualized) -->
	<div
		class="flex-1 overflow-y-auto overflow-x-hidden"
		data-tree-body
		bind:this={scrollEl}
		onscroll={onScroll}
	>
		{#if tree.flatRows.length === 0}
			<div class="text-[11px] text-neutral-600 px-3 py-6 text-center">
				No files yet
			</div>
		{:else}
			<div style="height:{virt.totalH}px; position:relative;">
				<div style="transform:translateY({virt.offsetY}px);">
					{#each tree.flatRows.slice(virt.start, virt.end) as row (row.node.id)}
						{@render flatRowEl(row)}
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- ==================== Flat row renderer ==================== -->

{#snippet flatRowEl(row: FlatRow)}
	{@const node = row.node}
	{@const depth = row.depth}
	{@const isFolder = node.type === 'folder'}
	{@const isExpanded = isFolder && tree.expanded.has(node.id)}
	{@const isSelected = tree.selected === node.id}
	{@const isEditing = tree.editing === node.id}
	{@const isDragSource = drag?.active && drag.nodeId === node.id}
	{@const isDropHere = drag?.active && dropTarget?.id === node.id}

	<button
		type="button"
		data-node-id={node.id}
		class="flex items-center h-5.5 pr-1 cursor-pointer group w-full text-left
			{isSelected ? 'bg-blue-500/20 text-neutral-100' : 'hover:bg-white/4 text-neutral-300'}
			{isDragSource ? 'opacity-40' : ''}
			{isDropHere && dropTarget?.valid ? 'bg-blue-500/15 outline-1 outline-blue-400/50' : ''}
			{isDropHere && !dropTarget?.valid ? 'bg-red-500/10 outline-1 outline-red-400/30' : ''}"
		style="padding-left: {depth * 10 + 4}px;"
		onclick={() => { tree.select(node.id); if (isFolder) tree.toggle(node.id); }}
		ondblclick={() => { if (!isFolder && onfileopen) onfileopen(node); }}
		onpointerdown={(e: PointerEvent) => { if (e.button === 0) onDragStart(e, node.id); }}
	>
		<!-- Chevron -->
		<span
			class="w-4 h-4 flex items-center justify-center shrink-0"
			role="button"
			tabindex="-1"
			onclick={(e: MouseEvent) => {
				if (isFolder) { e.stopPropagation(); tree.toggle(node.id); tree.select(node.id); }
			}}
			onkeydown={(e: KeyboardEvent) => {
				if (isFolder && (e.key === 'Enter' || e.key === ' ')) { e.stopPropagation(); tree.toggle(node.id); }
			}}
		>
			{#if isFolder}
				<span
					class="material-symbols-outlined text-[14px] text-neutral-500 transition-transform duration-100
						{isExpanded ? 'rotate-90' : ''}"
				>chevron_right</span>
			{/if}
		</span>

		<!-- Icon -->
		{#if isFolder}
			<span class="material-symbols-outlined text-[16px] mr-1.5 shrink-0
				{isExpanded ? 'text-yellow-400/80' : 'text-yellow-500/60'}">
				{isExpanded ? 'folder_open' : 'folder'}
			</span>
		{:else}
			<span class="w-4 h-4 mr-1.5 shrink-0 flex items-center justify-center">
				{@html fileIconSvg(node.name || 'file')}
			</span>
		{/if}

		<!-- Name / edit input -->
		{#if isEditing}
			<input
				class="flex-1 min-w-0 bg-neutral-800 text-xs text-neutral-100 px-1 rounded outline-none
					border border-blue-500/60 h-4.5 -my-px"
				bind:value={tree.editValue}
				use:autoFocus
				onblur={() => tree.commitEdit()}
				onclick={(e: MouseEvent) => e.stopPropagation()}
				ondblclick={(e: MouseEvent) => e.stopPropagation()}
			/>
		{:else}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<span
				class="text-xs truncate flex-1 min-w-0 {node.name ? '' : 'italic text-neutral-600'}"
				ondblclick={(e: MouseEvent) => {
					e.stopPropagation();
					if (!isFolder && onfileopen) onfileopen(node);
					else tree.startRename(node.id);
				}}
			>
				{node.name || '(new)'}
			</span>
			<span
				role="button"
				tabindex="-1"
				class="p-0.5 rounded shrink-0 opacity-0 group-hover:opacity-50 hover:opacity-100!
					hover:bg-white/10 text-neutral-400 cursor-pointer"
				title="Delete"
				onclick={(e: MouseEvent) => { e.stopPropagation(); (onrequestdelete ?? ((n) => tree.remove(n.id)))(node); }}
				onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.stopPropagation(); (onrequestdelete ?? ((n) => tree.remove(n.id)))(node); } }}
			>
				<span class="material-symbols-outlined text-[12px]">close</span>
			</span>
		{/if}
	</button>
{/snippet}
