<script lang="ts">
	import { getIcon, type Icon } from 'material-file-icons';
	import { TreeState, type TreeNode, type FlatRow } from './TreeState.svelte.ts';

	// --- Props ---

	let {
		tree,
		width = 144,
		theme = 'dark',
		onfileopen,
		onrequestdelete,
		onsetroot,
		onsetrootpath,
		oncopypath,
		onsearch,
		onreveal,
		onterminal,
	}: {
		tree: TreeState;
		width?: number;
		theme?: 'dark' | 'light';
		onfileopen?: (node: TreeNode) => void;
		onrequestdelete?: (node: TreeNode) => void;
		onsetroot?: () => void;
		onsetrootpath?: (path: string) => void;
		oncopypath?: (path: string) => void;
		onsearch?: (query: string) => Promise<string[]>;
		onreveal?: (path: string) => void;
		onterminal?: (path: string) => void;
	} = $props();

	// --- File icons (extensible) ---

	const CUSTOM_ICONS: Icon[] = [];

	function fileIconSvg(filename: string): string {
		const ext = filename.split('.').pop()?.toLowerCase() ?? '';
		const custom = CUSTOM_ICONS.find(i => i.extensions?.includes(ext));
		return (custom ?? getIcon(filename)).svg;
	}

	// --- Svelte action: auto-focus + select ---

	function autoFocus(el: HTMLInputElement) {
		setTimeout(() => { el.focus(); el.select(); }, 0);
	}

	// --- Search ---

	let searchOpen = $state(false);
	let searchQuery = $state('');
	let searchResults = $state<string[]>([]);
	let searchLoading = $state(false);
	let _searchTimer: ReturnType<typeof setTimeout> | null = null;

	function openSearch() {
		if (!onsearch) return;
		searchOpen = true;
		searchQuery = '';
		searchResults = [];
	}

	function closeSearch() {
		searchOpen = false;
		searchQuery = '';
		searchResults = [];
		searchLoading = false;
		if (_searchTimer) { clearTimeout(_searchTimer); _searchTimer = null; }
	}

	function onSearchInput(value: string) {
		searchQuery = value;
		if (_searchTimer) clearTimeout(_searchTimer);
		if (!value.trim()) {
			searchResults = [];
			searchLoading = false;
			return;
		}
		searchLoading = true;
		_searchTimer = setTimeout(async () => {
			if (!onsearch) return;
			try {
				const results = await onsearch(value.trim());
				if (searchQuery.trim() === value.trim()) {
					searchResults = results;
				}
			} catch {
				searchResults = [];
			} finally {
				searchLoading = false;
			}
		}, 200);
	}

	function onSearchFileOpen(relPath: string) {
		const node: TreeNode = {
			id: relPath,
			name: relPath.split(/[\\/]/).pop() ?? relPath,
			type: 'file',
			children: [],
		};
		onfileopen?.(node);
		closeSearch();
	}

	function onSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			closeSearch();
		}
	}

	// Search virtualization
	const searchVirt = $derived.by(() => {
		const count = searchResults.length;
		const totalH = count * rowH;
		const start = Math.max(0, Math.floor(scrollTop / rowH) - OVERSCAN);
		const end = Math.min(count, Math.ceil((scrollTop + viewportH) / rowH) + OVERSCAN + 1);
		return { start, end, offsetY: start * rowH, totalH };
	});

	// --- Virtualization ---

	const OVERSCAN = 5;

	let rowH = $state(26);
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

	// --- Context menu ---

	type CtxItem = { label: string; icon: string; action: () => void; separator?: false }
		| { separator: true };

	let ctxMenu = $state<{ x: number; y: number; items: CtxItem[] } | null>(null);
	let treeEl: HTMLDivElement | undefined = $state();

	function clampCtxMenu(el: HTMLElement) {
		if (!treeEl) return;
		const panel = treeEl.getBoundingClientRect();
		const menu = el.getBoundingClientRect();
		if (menu.bottom > panel.bottom) {
			el.style.top = `${Math.max(panel.top, panel.bottom - menu.height)}px`;
		}
		if (menu.right > panel.right) {
			el.style.left = `${Math.max(panel.left, panel.right - menu.width)}px`;
		}
	}

	function closeCtx() { ctxMenu = null; }

	function relativePath(absPath: string): string {
		const firstNode = tree.nodes[0];
		if (!firstNode) return absPath;
		const rootDir = firstNode.id.replace(/[\\/][^\\/]+$/, '');
		if (!rootDir || !absPath.startsWith(rootDir)) return absPath;
		return absPath.slice(rootDir.length + 1);
	}

	function showNodeContext(e: MouseEvent, node: TreeNode) {
		e.preventDefault();
		e.stopPropagation();
		tree.select(node.id);
		const isFolder = node.type === 'folder';
		const isExpanded = isFolder && tree.expanded.has(node.id);
		const items: CtxItem[] = [];
		if (!isFolder) {
			items.push({ label: 'Open', icon: 'open_in_new', action: () => { closeCtx(); onfileopen?.(node); } });
			items.push({ separator: true });
		}
		if (isFolder) {
			items.push({ label: 'New File', icon: 'note_add', action: () => { closeCtx(); tree.addFile(node.id); } });
			items.push({ label: 'New Folder', icon: 'create_new_folder', action: () => { closeCtx(); tree.addFolder(node.id); } });
			items.push({ separator: true });
			items.push({ label: isExpanded ? 'Collapse' : 'Expand', icon: isExpanded ? 'unfold_less' : 'unfold_more', action: () => { closeCtx(); tree.toggle(node.id); } });
			items.push({ separator: true });
		}
		items.push({ label: 'Rename', icon: 'edit', action: () => { closeCtx(); tree.startRename(node.id); } });
		items.push({ separator: true });
		items.push({ label: 'Copy Path', icon: 'content_copy', action: () => { closeCtx(); navigator.clipboard.writeText(node.id); } });
		items.push({ label: 'Copy Relative Path', icon: 'content_copy', action: () => { closeCtx(); navigator.clipboard.writeText(relativePath(node.id)); } });
		if (onreveal) {
			items.push({ label: 'Reveal in Explorer', icon: 'folder_open', action: () => { closeCtx(); onreveal!(node.id); } });
		}
		if (onterminal) {
			const termPath = isFolder ? node.id : node.id.replace(/[\\/][^\\/]+$/, '');
			items.push({ label: 'Open in Terminal', icon: 'terminal', action: () => { closeCtx(); onterminal!(termPath); } });
		}
		if (isFolder && onsetrootpath) {
			items.push({ separator: true });
			items.push({ label: 'Set as Root', icon: 'drive_file_move', action: () => { closeCtx(); onsetrootpath!(node.id); } });
		}
		items.push({ separator: true });
		items.push({ label: 'Delete', icon: 'delete', action: () => { closeCtx(); (onrequestdelete ?? ((n) => tree.remove(n.id)))(node); } });
		ctxMenu = { x: e.clientX, y: e.clientY, items };
	}

	function showBlankContext(e: MouseEvent) {
		e.preventDefault();
		const items: CtxItem[] = [
			{ label: 'New File', icon: 'note_add', action: () => { closeCtx(); tree.addFile(); } },
			{ label: 'New Folder', icon: 'create_new_folder', action: () => { closeCtx(); tree.addFolder(); } },
		];
		if (onsetroot) {
			items.push({ separator: true });
			items.push({ label: 'Open Folder', icon: 'folder_open', action: () => { closeCtx(); onsetroot!(); } });
		}
		if (tree.flatRows.length > 0) {
			items.push({ separator: true });
			items.push({ label: 'Collapse All', icon: 'unfold_less', action: () => { closeCtx(); tree.collapseAll(); } });
		}
		ctxMenu = { x: e.clientX, y: e.clientY, items };
	}

	$effect(() => {
		if (!ctxMenu) return;
		function onClick() { ctxMenu = null; }
		document.addEventListener('click', onClick, true);
		return () => document.removeEventListener('click', onClick, true);
	});
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
	class="jte-treeview flex flex-col h-full select-none overflow-hidden"
	data-theme={theme}
	role="tree"
	onkeydown={onKeydown}
	bind:this={treeEl}
>
	<!-- Toolbar -->
	<div class="flex items-center px-2 pt-1.5 pb-0.5 shrink-0 gap-0.5">
		{#if onsearch}
			<button class="p-0.5 rounded jte-tv-btn" title="Search files" onclick={openSearch}>
				<span class="material-symbols-outlined text-[16px]">search</span>
			</button>
		{/if}
		{#if onsetroot}
			<button class="p-0.5 rounded jte-tv-btn" title="Open folder" onclick={() => onsetroot?.()}>
				<span class="material-symbols-outlined text-[16px]">folder_open</span>
			</button>
		{/if}
		<button class="p-0.5 rounded jte-tv-btn" title="New File" onclick={() => tree.addFile()}>
			<span class="material-symbols-outlined text-[16px]">note_add</span>
		</button>
		<button class="p-0.5 rounded jte-tv-btn" title="New Folder" onclick={() => tree.addFolder()}>
			<span class="material-symbols-outlined text-[16px]">create_new_folder</span>
		</button>
		<button class="p-0.5 rounded jte-tv-btn" title="Collapse All" onclick={() => tree.collapseAll()}>
			<span class="material-symbols-outlined text-[16px]">unfold_less</span>
		</button>
	</div>

	<!-- Root label -->
	{#if tree.root && tree.root !== 'Untitled'}
		<div class="flex items-center h-6 px-2 pb-0.5 shrink-0 gap-1.5">
			<span class="material-symbols-outlined text-[16px] jte-tv-folder-icon shrink-0">folder</span>
			<span class="text-[12px] font-medium jte-tv-text truncate flex-1 min-w-0">{tree.root}</span>
		</div>
	{/if}

	<!-- Search bar -->
	{#if searchOpen}
		<div class="flex items-center gap-1 px-2 pb-1 shrink-0">
			<span class="material-symbols-outlined text-[14px] jte-tv-muted shrink-0">search</span>
			<input
				class="jte-tv-search-input flex-1 min-w-0 text-[12px] px-1.5 py-0.5 rounded outline-none border border-transparent focus:border-blue-500/60"
				placeholder="Search files…"
				bind:value={searchQuery}
				oninput={(e: Event) => onSearchInput((e.currentTarget as HTMLInputElement).value)}
				onkeydown={onSearchKeydown}
				use:autoFocus
			/>
			{#if searchLoading}
				<span class="material-symbols-outlined text-[14px] jte-tv-muted shrink-0 animate-spin">progress_activity</span>
			{/if}
			<button
				class="p-0.5 rounded jte-tv-btn shrink-0"
				title="Close search"
				onclick={closeSearch}
			>
				<span class="material-symbols-outlined text-[14px]">close</span>
			</button>
		</div>
	{/if}

	<!-- Tree body / search results (virtualized) -->
	<div
		class="flex-1 overflow-y-auto overflow-x-hidden m-2"
		data-tree-body
		bind:this={scrollEl}
		onscroll={onScroll}
		oncontextmenu={searchOpen ? undefined : showBlankContext}
	>
		{#if searchOpen}
			{#if searchQuery.trim() && searchResults.length === 0 && !searchLoading}
				<div class="flex flex-col items-center justify-center px-3 py-6">
					<span class="text-[11px] jte-tv-muted">No files found</span>
				</div>
			{:else if searchResults.length > 0}
				<div style="height:{searchVirt.totalH}px; position:relative;">
					<div style="transform:translateY({searchVirt.offsetY}px);">
						{#each searchResults.slice(searchVirt.start, searchVirt.end) as fullPath (fullPath)}
							{@render searchResultRow(fullPath)}
						{/each}
					</div>
				</div>
			{/if}
		{:else if tree.flatRows.length === 0}
			<div class="flex flex-col items-center justify-center gap-3 px-3 py-8">
				{#if onsetroot}
					<button
						class="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] jte-tv-open-btn"
						onclick={() => onsetroot?.()}
					>
						<span class="material-symbols-outlined text-[16px]">folder_open</span>
						Open Folder
					</button>
				{/if}
				<span class="text-[11px] jte-tv-muted">No files yet</span>
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
		class="jte-tree-row flex items-center h-7 pr-1.5 cursor-pointer w-full text-left gap-0.5
			{isSelected ? 'jte-tv-row-selected' : 'jte-tv-row'}
			{isDragSource ? 'opacity-40' : ''}
			{isDropHere && dropTarget?.valid ? 'bg-blue-500/15 outline-1 outline-blue-400/50' : ''}
			{isDropHere && !dropTarget?.valid ? 'bg-red-500/10 outline-1 outline-red-400/30' : ''}"
		style="padding-left: {depth * 12 + 6}px;"
		onclick={() => { tree.select(node.id); if (isFolder) tree.toggle(node.id); }}
		ondblclick={() => { if (!isFolder && onfileopen) onfileopen(node); }}
		onpointerdown={(e: PointerEvent) => { if (e.button === 0) onDragStart(e, node.id); }}
		oncontextmenu={(e: MouseEvent) => showNodeContext(e, node)}
	>
		<!-- Chevron -->
		<span
			class="w-5 h-5 flex items-center justify-center shrink-0"
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
					class="material-symbols-outlined text-[16px] jte-tv-chevron transition-transform duration-100
						{isExpanded ? 'rotate-90' : ''}"
				>chevron_right</span>
			{/if}
		</span>

		<!-- Icon -->
		{#if isFolder}
			<span class="material-symbols-outlined text-[18px] mr-1.5 shrink-0 jte-tv-folder-icon
				{isExpanded ? 'jte-tv-folder-open' : ''}">
				{isExpanded ? 'folder_open' : 'folder'}
			</span>
		{:else}
			<span class="jte-file-icon w-5 h-5 mr-1.5 shrink-0 flex items-center justify-center">
				{@html fileIconSvg(node.name || 'file')}
			</span>
		{/if}

		<!-- Name / edit input -->
		{#if isEditing}
			<input
				class="jte-tv-edit-input flex-1 min-w-0 text-[13px] px-1 rounded outline-none
					border border-blue-500/60 h-5.5 -my-px"
				bind:value={tree.editValue}
				use:autoFocus
				onblur={() => tree.commitEdit()}
				onclick={(e: MouseEvent) => e.stopPropagation()}
				ondblclick={(e: MouseEvent) => e.stopPropagation()}
			/>
		{:else}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<span
				class="text-[13px] truncate flex-1 min-w-0 {node.name ? '' : 'italic jte-tv-muted'}"
				ondblclick={(e: MouseEvent) => {
					e.stopPropagation();
					if (!isFolder && onfileopen) onfileopen(node);
					else tree.startRename(node.id);
				}}
			>
				{node.name || '(new)'}
			</span>
		{/if}
	</button>
{/snippet}

<!-- ==================== Search result row ==================== -->

{#snippet searchResultRow(relPath: string)}
	{@const name = relPath.split(/[\\/]/).pop() ?? relPath}
	{@const dir = relPath.includes('/') || relPath.includes('\\')
		? relPath.slice(0, relPath.length - name.length - 1)
		: ''}
	<button
		type="button"
		class="jte-tree-row flex items-center h-7 pr-1.5 cursor-pointer w-full text-left gap-0.5 jte-tv-row"
		style="padding-left: 6px;"
		onclick={() => onSearchFileOpen(relPath)}
	>
		<span class="jte-file-icon w-5 h-5 mr-1.5 shrink-0 flex items-center justify-center">
			{@html fileIconSvg(name)}
		</span>
		<span class="text-[13px] truncate flex-1 min-w-0">{name}</span>
		{#if dir}
			<span class="text-[11px] jte-tv-muted truncate ml-1 max-w-[40%]">{dir}</span>
		{/if}
	</button>
{/snippet}

<!-- Context menu -->
{#if ctxMenu}
	<div
		class="jte-tv-ctx fixed z-50"
		style="left:{ctxMenu.x}px; top:{ctxMenu.y}px;"
		use:clampCtxMenu
	>
		{#each ctxMenu.items as item}
			{#if item.separator}
				<div class="jte-tv-ctx-sep"></div>
			{:else}
				<button class="jte-tv-ctx-item" onclick={item.action}>
					<span class="material-symbols-outlined text-[16px]">{item.icon}</span>
					{item.label}
				</button>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.jte-file-icon :global(svg) {
		width: 100%;
		height: 100%;
		display: block;
	}

	/* --- Theme: dark (default) --- */
	.jte-treeview {
		color: var(--jte-fg, #d4d4d4);
	}
	.jte-tv-text { color: var(--jte-fg, #d4d4d4); }
	.jte-tv-muted { color: var(--jte-status-fg, #666); }
	.jte-tv-chevron { color: var(--jte-status-fg, #777); }
	.jte-tv-folder-icon { color: #d4a050; opacity: 0.6; }
	.jte-tv-folder-open { opacity: 0.8; }
	.jte-tv-btn {
		background: transparent;
		border: none;
		color: var(--jte-status-fg, #777);
		cursor: pointer;
	}
	.jte-tv-btn:hover {
		background: var(--jte-toolbar-hover, rgba(255,255,255,0.1));
		color: var(--jte-fg, #d4d4d4);
	}
	.jte-tv-row {
		background: transparent;
		color: var(--jte-fg, #d4d4d4);
	}
	.jte-tv-row:hover {
		background: var(--jte-toolbar-hover, rgba(255,255,255,0.04));
	}
	.jte-tv-row-selected {
		background: rgba(59, 130, 246, 0.2);
		color: var(--jte-fg, #d4d4d4);
	}
	.jte-tv-edit-input {
		background: var(--jte-input-bg, #1e1e1e);
		color: var(--jte-fg, #d4d4d4);
	}
	.jte-tv-open-btn {
		background: var(--jte-toolbar-hover, rgba(255,255,255,0.06));
		border: 1px solid var(--jte-border, #3a3a3a);
		color: var(--jte-fg, #d4d4d4);
		cursor: pointer;
	}
	.jte-tv-open-btn:hover {
		background: var(--jte-toolbar-hover, rgba(255,255,255,0.1));
		border-color: var(--jte-accent, #569cd6);
	}

	/* --- Search input --- */
	.jte-tv-search-input {
		background: var(--jte-input-bg, #1e1e1e);
		color: var(--jte-fg, #d4d4d4);
	}
	.jte-tv-search-input::placeholder {
		color: var(--jte-status-fg, #666);
	}

	/* --- Context menu --- */
	.jte-tv-ctx {
		min-width: 160px;
		background: var(--jte-menubar-bg, #252525);
		border: 1px solid var(--jte-border, #3a3a3a);
		border-radius: 6px;
		padding: 4px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
	}
	.jte-tv-ctx-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 5px 8px;
		background: transparent;
		border: none;
		color: var(--jte-toolbar-fg, #ccc);
		cursor: pointer;
		font-family: var(--jte-ui-font, system-ui, sans-serif);
		font-size: 12px;
		text-align: left;
		border-radius: 4px;
		white-space: nowrap;
	}
	.jte-tv-ctx-item:hover {
		background: var(--jte-toolbar-hover, #333);
	}
	.jte-tv-ctx-sep {
		height: 1px;
		background: var(--jte-border, #333);
		margin: 4px 0;
	}
</style>
