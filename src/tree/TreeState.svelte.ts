// ============================================================
//  TreeState — headless reactive tree state (hub-and-spoke)
//  Zero DOM dependencies, pure Svelte 5 runes
// ============================================================

export type TreeNode = {
	id: string;
	name: string;
	type: 'file' | 'folder';
	children: TreeNode[];
};

export type FlatRow = { node: TreeNode; depth: number };

function sorted(nodes: TreeNode[]): TreeNode[] {
	return [...nodes].sort((a, b) => {
		if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
		return a.name.localeCompare(b.name);
	});
}

export class TreeState {
	root = $state('Untitled');
	nodes: TreeNode[] = $state([]);
	expanded: Set<string> = $state(new Set());
	selected = $state<string | null>(null);
	editing = $state<string | null>(null);
	editValue = $state('');

	// Spoke callbacks
	onselect: ((node: TreeNode | null) => void) | null = null;
	oncreate: ((node: TreeNode, parentId: string | null) => void) | null = null;
	ondelete: ((node: TreeNode) => void) | null = null;
	onrename: ((node: TreeNode, oldName: string) => void) | null = null;
	onrootchange: ((name: string) => void) | null = null;
	onmove: ((node: TreeNode, oldParentId: string | null, newParentId: string | null) => void) | null = null;

	_nextId = 0;
	_uid() { return `t${this._nextId++}`; }

	// --- Read API ---

	get selectedNode(): TreeNode | null {
		return this.selected ? this.find(this.selected) : null;
	}

	get selectedPath(): string[] {
		if (!this.selected) return [];
		const node = this.find(this.selected);
		if (!node) return [];
		return [...this._ancestors(this.selected).map(n => n.name), node.name];
	}

	get insertTarget(): string | null {
		if (!this.selected) return null;
		const node = this.find(this.selected);
		if (!node) return null;
		if (node.type === 'folder') return node.id;
		return this._parentOf(this.selected);
	}

	find(id: string, list?: TreeNode[]): TreeNode | null {
		for (const n of (list ?? this.nodes)) {
			if (n.id === id) return n;
			const found = this.find(id, n.children);
			if (found) return found;
		}
		return null;
	}

	/** Flat visible rows — single derived, drives rendering + keyboard nav */
	flatRows: FlatRow[] = $derived.by(() => {
		const rows: FlatRow[] = [];
		const walk = (nodes: TreeNode[], depth: number) => {
			for (const n of sorted(nodes)) {
				rows.push({ node: n, depth });
				if (n.type === 'folder' && this.expanded.has(n.id)) walk(n.children, depth + 1);
			}
		};
		walk(this.nodes, 0);
		return rows;
	});

	// --- Write API ---

	setRoot(name: string) {
		this.root = name;
		this.onrootchange?.(name);
	}

	private _addNode(type: 'file' | 'folder', parentId?: string | null): TreeNode {
		const node: TreeNode = { id: this._uid(), name: '', type, children: [] };
		this._insert(node, parentId ?? this.insertTarget);
		this.selected = node.id;
		this.editing = node.id;
		this.editValue = '';
		return node;
	}

	addFile(parentId?: string | null) { return this._addNode('file', parentId); }
	addFolder(parentId?: string | null) { return this._addNode('folder', parentId); }

	startRename(id: string) {
		const node = this.find(id);
		if (!node) return;
		this.editing = id;
		this.editValue = node.name;
	}

	commitEdit() {
		if (!this.editing) return;
		const node = this.find(this.editing);
		const editId = this.editing;
		this.editing = null;
		if (!node) return;
		const trimmed = this.editValue.trim();
		if (!trimmed) {
			if (!node.name) this.remove(editId);
			return;
		}
		const oldName = node.name;
		node.name = trimmed;
		if (!oldName) {
			this.oncreate?.(node, this._parentOf(node.id));
		} else if (oldName !== trimmed) {
			this.onrename?.(node, oldName);
		}
	}

	cancelEdit() {
		if (!this.editing) return;
		const node = this.find(this.editing);
		const editId = this.editing;
		this.editing = null;
		if (node && !node.name) this.remove(editId);
	}

	private _mutExpanded(fn: (s: Set<string>) => void) {
		const next = new Set(this.expanded);
		fn(next);
		this.expanded = next;
	}

	toggle(id: string) {
		this._mutExpanded(s => s.has(id) ? s.delete(id) : s.add(id));
	}

	select(id: string | null) {
		this.selected = id;
		this.onselect?.(id ? this.find(id) : null);
	}

	remove(id: string) {
		const node = this.find(id);
		if (!node) return;
		const hadName = !!node.name;
		this._removeFrom(id, this.nodes);
		if (this.selected === id) this.selected = null;
		this._mutExpanded(s => s.delete(id));
		if (hadName) this.ondelete?.(node);
	}

	reveal(id: string) {
		this._mutExpanded(s => {
			for (const n of this._ancestors(id)) {
				if (n.type === 'folder') s.add(n.id);
			}
		});
	}

	expandAll() {
		this._mutExpanded(s => this._walk(this.nodes, n => { if (n.type === 'folder') s.add(n.id); }));
	}

	collapseAll() {
		this.expanded = new Set();
	}

	/** Move node into a folder (or root if null). Returns error string or null. */
	move(id: string, newParentId: string | null): string | null {
		const node = this.find(id);
		if (!node) return 'Node not found';
		if (newParentId === id) return 'Cannot drop into itself';
		if (newParentId && this._isDescendant(newParentId, id)) return 'Cannot drop into own descendant';
		const oldParentId = this._parentOf(id);
		if (oldParentId === newParentId) return null;
		if (newParentId) {
			const target = this.find(newParentId);
			if (!target || target.type !== 'folder') return 'Target is not a folder';
		}
		this._removeFrom(id, this.nodes);
		if (!newParentId) {
			this.nodes.push(node);
		} else {
			this.find(newParentId)!.children.push(node);
			this._mutExpanded(s => s.add(newParentId));
		}
		this.onmove?.(node, oldParentId, newParentId);
		return null;
	}

	// --- Internal ---

	_isDescendant(candidateChildId: string, ancestorId: string): boolean {
		const ancestor = this.find(ancestorId);
		if (!ancestor) return false;
		return !!this.find(candidateChildId, ancestor.children);
	}

	_insert(node: TreeNode, parentId: string | null) {
		if (!parentId) { this.nodes.push(node); return; }
		const parent = this.find(parentId);
		if (parent?.type === 'folder') {
			parent.children.push(node);
			this._mutExpanded(s => s.add(parent.id));
		} else {
			this.nodes.push(node);
		}
	}

	_removeFrom(id: string, list: TreeNode[]): boolean {
		const idx = list.findIndex(n => n.id === id);
		if (idx !== -1) { list.splice(idx, 1); return true; }
		for (const n of list) {
			if (this._removeFrom(id, n.children)) return true;
		}
		return false;
	}

	_parentOf(id: string, list?: TreeNode[], pid: string | null = null): string | null {
		for (const n of (list ?? this.nodes)) {
			if (n.id === id) return pid;
			const found = this._parentOf(id, n.children, n.id);
			if (found !== null) return found;
		}
		return null;
	}

	_ancestors(id: string, list?: TreeNode[], path: TreeNode[] = []): TreeNode[] {
		for (const n of (list ?? this.nodes)) {
			if (n.id === id) return path;
			const found = this._ancestors(id, n.children, [...path, n]);
			if (found.length) return found;
		}
		return [];
	}

	_walk(list: TreeNode[], fn: (n: TreeNode) => void) {
		for (const n of list) { fn(n); this._walk(n.children, fn); }
	}
}
