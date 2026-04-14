<script>
	import "vanilla-colorful/hex-color-picker.js";

	let { editor, pinned = false, onpin, tick = 0, aiActions = [], aiGenerating = false, onaiaction, onaistop } = $props();

	const fontSizes = ["8px", "10px", "12px", "14px", "18px", "24px", "48px", "96px"];
	const lineHeights = ["1", "1.15", "1.5", "2", "3"];
	const spacingPresets = [
		{ label: "0", value: "0px" },
		{ label: "4", value: "4px" },
		{ label: "8", value: "8px" },
		{ label: "16", value: "16px" },
		{ label: "24", value: "24px" },
	];
	const fontFamilies = [
		{ label: "Default", value: "" },
		{ label: "Sans Serif", value: "system-ui, -apple-system, sans-serif" },
		{ label: "Serif", value: 'Georgia, "Times New Roman", serif' },
		{ label: "Monospace", value: 'Consolas, "Courier New", monospace' },
	];

	// Swatch presets
	const textSwatches = [
		// Pure spectrum
		"#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff",
		// Softer tones
		"#e06c75", "#e5c07b", "#98c379", "#56b6c2", "#61afef", "#c678dd",
		// Neutrals
		"#ffffff", "#d4d4d4", "#808080", "#505050", "#282828", "#000000",
	];
	const highlightSwatches = [
		// Pure spectrum
		"#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff",
		// Softer tones
		"#e06c75", "#e5c07b", "#98c379", "#56b6c2", "#61afef", "#c678dd",
		// Highlighter colors
		"#ffcc00", "#ff9632", "#ff6b6b", "#69db7c", "#74c0fc", "#e599f7",
	];

	let openPopup = $state(null);
	let overflowOpen = $state(false);
	let toolbarEl = $state();

	function closeAll() { openPopup = null; overflowOpen = false; }
	function closePopups() { openPopup = null; }
	function togglePopup(name) { openPopup = openPopup === name ? null : name; }

	// Reactive editor state — recomputed on every transaction via tick dependency
	let state = $derived.by(() => {
		tick;
		if (!editor) return {};
		const blockAttrs = editor.isActive('heading')
			? editor.getAttributes('heading')
			: editor.getAttributes('paragraph');
		return {
			bold: editor.isActive('bold'),
			italic: editor.isActive('italic'),
			underline: editor.isActive('underline'),
			strike: editor.isActive('strike'),
			link: editor.isActive('link'),
			highlight: editor.isActive('highlight'),
			code: editor.isActive('code'),
			blockquote: editor.isActive('blockquote'),
			bulletList: editor.isActive('bulletList'),
			orderedList: editor.isActive('orderedList'),
			table: editor.isActive('table'),
			heading: editor.isActive('heading'),
			heading1: editor.isActive('heading', { level: 1 }),
			heading2: editor.isActive('heading', { level: 2 }),
			heading3: editor.isActive('heading', { level: 3 }),
			alignLeft: editor.isActive({ textAlign: 'left' }),
			alignCenter: editor.isActive({ textAlign: 'center' }),
			alignRight: editor.isActive({ textAlign: 'right' }),
			alignJustify: editor.isActive({ textAlign: 'justify' }),
			fontSize: editor.getAttributes('textStyle')?.fontSize || '',
			fontFamily: editor.getAttributes('textStyle')?.fontFamily || '',
			color: editor.getAttributes('textStyle')?.color || '',
			highlightColor: editor.getAttributes('highlight')?.color || '#ffcc00',
			canMerge: editor.isActive('table') && editor.can().mergeCells(),
			canSplit: editor.isActive('table') && editor.can().splitCell(),
			lineHeight: blockAttrs?.lineHeight || null,
			spacingBefore: blockAttrs?.spacingBefore || null,
			spacingAfter: blockAttrs?.spacingAfter || null,
		};
	});

	let headingIcon = $derived(
		state.heading1 ? 'format_h1' :
		state.heading2 ? 'format_h2' :
		state.heading3 ? 'format_h3' :
		'format_paragraph'
	);

	let fontSizeNum = $derived(parseInt(state.fontSize) || 15);

	function toggleMark(name) {
		editor?.chain().focus().toggleMark(name).run();
	}

	function setAlign(align) {
		editor?.chain().focus().setTextAlign(align).run();
	}

	function setLH(value) {
		if (value === null) editor?.chain().focus().unsetLineHeight().run();
		else editor?.chain().focus().setLineHeight(value).run();
	}

	function setSB(value) {
		if (value === null) editor?.chain().focus().unsetSpacingBefore().run();
		else editor?.chain().focus().setSpacingBefore(value).run();
	}

	function setSA(value) {
		if (value === null) editor?.chain().focus().unsetSpacingAfter().run();
		else editor?.chain().focus().setSpacingAfter(value).run();
	}

	function setFontSize(size) {
		editor?.chain().focus().setFontSize(size).run();
		closePopups();
	}

	function setFontFamily(value) {
		if (!value) editor?.chain().focus().unsetFontFamily().run();
		else editor?.chain().focus().setFontFamily(value).run();
		closePopups();
	}

	function toggleList(type) {
		if (type === "bullet") editor?.chain().focus().toggleBulletList().run();
		else editor?.chain().focus().toggleOrderedList().run();
	}

	function setHeading(level) {
		if (level === 0) editor?.chain().focus().setParagraph().run();
		else editor?.chain().focus().toggleHeading({ level }).run();
		closePopups();
	}

	function tableAction(action) {
		const chain = editor?.chain().focus();
		if (!chain) return;
		switch (action) {
			case "addRowAbove": chain.addRowBefore().run(); break;
			case "addRowBelow": chain.addRowAfter().run(); break;
			case "deleteRow": chain.deleteRow().run(); break;
			case "addColLeft": chain.addColumnBefore().run(); break;
			case "addColRight": chain.addColumnAfter().run(); break;
			case "deleteCol": chain.deleteColumn().run(); break;
			case "mergeCells": chain.mergeCells().run(); break;
			case "splitCell": chain.splitCell().run(); break;
			case "deleteTable": chain.deleteTable().run(); break;
		}
		closePopups();
	}

	// Swatch clicks: focus editor then apply (instant, one-shot)
	function applyColor(hex) {
		editor?.chain().focus().setColor(hex).run();
	}

	function applyHighlight(hex) {
		editor?.chain().focus().toggleHighlight({ color: hex }).run();
	}

	// Picker drag: apply without stealing focus (continuous updates)
	function applyColorLive(hex) {
		editor?.chain().setColor(hex).run();
	}

	function applyHighlightLive(hex) {
		editor?.chain().toggleHighlight({ color: hex }).run();
	}

	// Svelte action for vanilla-colorful (can't bind hyphenated custom events via onX)
	function pickerAction(node, callback) {
		const handler = (e) => callback(e.detail.value);
		node.addEventListener("color-changed", handler);
		return { destroy() { node.removeEventListener("color-changed", handler); } };
	}

	function insertTable() {
		editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
	}

	function insertImage() {
		const url = prompt("Image URL:");
		if (url) {
			editor?.chain().focus().setImage({ src: url }).run();
		}
	}

	function clearFormatting() {
		editor?.chain().focus().clearNodes().unsetAllMarks().run();
	}

	function setLink() {
		if (state.link) {
			editor?.chain().focus().unsetLink().run();
			return;
		}
		const url = prompt("URL:");
		if (url) {
			editor?.chain().focus().setLink({ href: url }).run();
		}
	}

	function handlePopupClick(e) {
		e.stopPropagation();
	}

	function commitFontSize(raw) {
		let n = parseInt(raw);
		if (!n || n < 1) return;
		if (n > 999) n = 999;
		editor?.chain().focus().setFontSize(n + "px").run();
	}

	function handleFontSizeKey(e) {
		if (e.key === "Enter") {
			e.preventDefault();
			commitFontSize(e.target.value);
		} else if (e.key === "Escape") {
			e.target.blur();
			editor?.commands.focus();
		}
	}

	function handleFontSizeBlur(e) {
		const v = e.target.value.trim();
		if (v) commitFontSize(v);
	}

	// Close all dropdowns on mousedown outside toolbar
	$effect(() => {
		if (!toolbarEl) return;
		function onMouseDown(e) {
			if (!toolbarEl.contains(e.target)) closeAll();
		}
		document.addEventListener("mousedown", onMouseDown, true);
		return () => document.removeEventListener("mousedown", onMouseDown, true);
	});

	// Responsive: collapse alignment + block tools into overflow when toolbar is narrow
	let toolbarWidth = $state(Infinity);
	let needsOverflow = $derived(toolbarWidth < 620);

	$effect(() => {
		if (!toolbarEl) return;
		const ro = new ResizeObserver((entries) => {
			toolbarWidth = entries[0].contentRect.width;
		});
		ro.observe(toolbarEl);
		return () => ro.disconnect();
	});
</script>

{#if editor}
	<div class="jte-bubble" class:jte-bubble-pinned={pinned} data-bubble-menu bind:this={toolbarEl}>
		<!-- Heading dropdown -->
		<div class="jte-bb-wrap">
			<button class="jte-bb" title="Paragraph style" onclick={() => togglePopup("heading")}>
				<span class="material-symbols-outlined">{headingIcon}</span>
				<span class="material-symbols-outlined" style="font-size:12px">expand_more</span>
			</button>
			{#if openPopup === "heading"}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="jte-bb-dropdown jte-bb-dd-block" onclick={handlePopupClick}>
					<button class="jte-bb-dd-item" class:active={!state.heading} onclick={() => setHeading(0)} style="font-size:13px">Paragraph</button>
					<button class="jte-bb-dd-item" class:active={state.heading1} onclick={() => setHeading(1)} style="font-size:20px;font-weight:bold">Heading 1</button>
					<button class="jte-bb-dd-item" class:active={state.heading2} onclick={() => setHeading(2)} style="font-size:16px;font-weight:bold">Heading 2</button>
					<button class="jte-bb-dd-item" class:active={state.heading3} onclick={() => setHeading(3)} style="font-size:14px;font-weight:600">Heading 3</button>
				</div>
			{/if}
		</div>

		<!-- Font family dropdown -->
		<div class="jte-bb-wrap">
			<button class="jte-bb" title="Font family" onclick={() => togglePopup("fontFamily")}>
				<span class="material-symbols-outlined">font_download</span>
				<span class="material-symbols-outlined" style="font-size:12px">expand_more</span>
			</button>
			{#if openPopup === "fontFamily"}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="jte-bb-dropdown" onclick={handlePopupClick}>
					<button
						class="jte-bb-dd-item"
						class:active={!state.fontFamily}
						onclick={() => setFontFamily(null)}
					>Default</button>
					{#each fontFamilies as ff}
						<button
							class="jte-bb-dd-item"
							class:active={state.fontFamily === ff.value}
							style="font-family:{ff.value}"
							onclick={() => setFontFamily(ff.value)}
						>{ff.label}</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Font size: input + dropdown arrow -->
		<div class="jte-bb-wrap jte-bb-split">
			<input
				class="jte-bb-size-input"
				type="text"
				title="Font Size"
				value={fontSizeNum}
				onkeydown={handleFontSizeKey}
				onblur={handleFontSizeBlur}
				onfocus={(e) => e.target.select()}
			/>
			<button class="jte-bb jte-bb-split-arrow" title="Font Size" onclick={() => togglePopup("fontSize")}>
				<span class="material-symbols-outlined" style="font-size:12px">expand_more</span>
			</button>
			{#if openPopup === "fontSize"}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="jte-bb-dropdown" onclick={(e) => e.stopPropagation()}>
					{#each fontSizes as size}
						<button
							class="jte-bb-dd-item"
							class:active={state.fontSize === size}
							onclick={() => setFontSize(size)}
						>{size}</button>
					{/each}
				</div>
			{/if}
		</div>

		<span class="jte-bb-sep"></span>

		<!-- Inline marks + link -->
		<button class="jte-bb" class:active={state.bold} title="Bold (Ctrl+B)" onclick={() => toggleMark("bold")}>
			<span class="material-symbols-outlined">format_bold</span>
		</button>
		<button class="jte-bb" class:active={state.italic} title="Italic (Ctrl+I)" onclick={() => toggleMark("italic")}>
			<span class="material-symbols-outlined">format_italic</span>
		</button>
		<button class="jte-bb" class:active={state.underline} title="Underline (Ctrl+U)" onclick={() => toggleMark("underline")}>
			<span class="material-symbols-outlined">format_underlined</span>
		</button>
		<button class="jte-bb" class:active={state.strike} title="Strikethrough" onclick={() => toggleMark("strike")}>
			<span class="material-symbols-outlined">strikethrough_s</span>
		</button>
		<button class="jte-bb" class:active={state.link} title="Link" onclick={setLink}>
			<span class="material-symbols-outlined">link</span>
		</button>
		<button class="jte-bb" title="Clear Formatting" onclick={clearFormatting}>
			<span class="material-symbols-outlined">format_clear</span>
		</button>

		<span class="jte-bb-sep"></span>

		<!-- Text color -->
		<div class="jte-bb-wrap">
			<button class="jte-bb jte-bb-color-stack" title="Text Color" onclick={() => togglePopup("textColor")}>
				<span class="jte-bb-color-icon">A</span>
				<span class="jte-bb-color-bar" style="background:{state.color || 'var(--jte-fg, #d4d4d4)'}"></span>
			</button>
			{#if openPopup === "textColor"}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="jte-bb-dropdown jte-bb-color-panel" onclick={handlePopupClick}>
					<hex-color-picker use:pickerAction={applyColorLive} color={state.color || '#d4d4d4'}></hex-color-picker>
					<div class="jte-bb-swatches">
						{#each textSwatches as c}
							<button
								class="jte-bb-swatch"
								style="background:{c}"
								title={c}
								onclick={() => applyColor(c)}
							></button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Highlight color -->
		<div class="jte-bb-wrap">
			<button class="jte-bb jte-bb-color-stack" class:active={state.highlight} title="Highlight" onclick={() => togglePopup("highlightColor")}>
				<span class="material-symbols-outlined jte-bb-color-icon">ink_highlighter</span>
				<span class="jte-bb-color-bar" style="background:{state.highlightColor}"></span>
			</button>
			{#if openPopup === "highlightColor"}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="jte-bb-dropdown jte-bb-color-panel" onclick={handlePopupClick}>
					<hex-color-picker use:pickerAction={applyHighlightLive} color={state.highlightColor}></hex-color-picker>
					<div class="jte-bb-swatches">
						{#each highlightSwatches as c}
							<button
								class="jte-bb-swatch"
								style="background:{c}"
								title={c}
								onclick={() => applyHighlight(c)}
							></button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<span class="jte-bb-sep"></span>

		<!-- Alignment -->
		<button class="jte-bb" class:active={state.alignLeft} title="Align Left" onclick={() => setAlign("left")}>
			<span class="material-symbols-outlined">format_align_left</span>
		</button>
		<button class="jte-bb" class:active={state.alignCenter} title="Align Center" onclick={() => setAlign("center")}>
			<span class="material-symbols-outlined">format_align_center</span>
		</button>
		<button class="jte-bb" class:active={state.alignRight} title="Align Right" onclick={() => setAlign("right")}>
			<span class="material-symbols-outlined">format_align_right</span>
		</button>
		<button class="jte-bb" class:active={state.alignJustify} title="Justify" onclick={() => setAlign("justify")}>
			<span class="material-symbols-outlined">format_align_justify</span>
		</button>

		<!-- Spacing dropdown -->
		<div class="jte-bb-wrap">
			<button class="jte-bb" title="Line & paragraph spacing" onclick={() => togglePopup("spacing")}>
				<span class="material-symbols-outlined">format_line_spacing</span>
				<span class="material-symbols-outlined" style="font-size:12px">expand_more</span>
			</button>
			{#if openPopup === "spacing"}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="jte-bb-dropdown jte-bb-spacing-panel" onclick={handlePopupClick}>
					<div class="jte-bb-dd-label">Line spacing</div>
					<div class="jte-bb-spacing-row">
						<button class="jte-bb-chip" class:active={!state.lineHeight} onclick={() => setLH(null)}>—</button>
						{#each lineHeights as lh}
							<button class="jte-bb-chip" class:active={state.lineHeight === lh} onclick={() => setLH(lh)}>{lh}</button>
						{/each}
					</div>
					<div class="jte-bb-dd-sep"></div>
					<div class="jte-bb-dd-label">Before paragraph</div>
					<div class="jte-bb-spacing-row">
						<button class="jte-bb-chip" class:active={!state.spacingBefore} onclick={() => setSB(null)}>—</button>
						{#each spacingPresets as sp}
							<button class="jte-bb-chip" class:active={state.spacingBefore === sp.value} onclick={() => setSB(sp.value)}>{sp.label}</button>
						{/each}
					</div>
					<div class="jte-bb-dd-sep"></div>
					<div class="jte-bb-dd-label">After paragraph</div>
					<div class="jte-bb-spacing-row">
						<button class="jte-bb-chip" class:active={!state.spacingAfter} onclick={() => setSA(null)}>—</button>
						{#each spacingPresets as sp}
							<button class="jte-bb-chip" class:active={state.spacingAfter === sp.value} onclick={() => setSA(sp.value)}>{sp.label}</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<span class="jte-bb-sep"></span>

		<!-- Lists + block tools — collapse when narrow -->
		{#if needsOverflow}
			<div class="jte-bb-wrap">
				<button class="jte-bb jte-bb-overflow-btn" title="More formatting" onclick={() => { overflowOpen = !overflowOpen; }}>
					<span class="material-symbols-outlined">more_horiz</span>
				</button>
				{#if overflowOpen}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="jte-bb-dropdown jte-bb-dropdown-right jte-bb-overflow-panel" onclick={handlePopupClick}>
						<div class="jte-bb-overflow-row">
							<button class="jte-bb" class:active={state.bulletList} title="Bullet List" onclick={() => toggleList("bullet")}>
								<span class="material-symbols-outlined">format_list_bulleted</span>
							</button>
							<button class="jte-bb" class:active={state.orderedList} title="Ordered List" onclick={() => toggleList("ordered")}>
								<span class="material-symbols-outlined">format_list_numbered</span>
							</button>
						</div>
						<div class="jte-bb-dd-sep"></div>
						<button class="jte-bb-dd-item" class:active={state.code} onclick={() => toggleMark("code")}>
							<span class="material-symbols-outlined" style="font-size:16px">code</span> Inline Code
						</button>
						<button class="jte-bb-dd-item" class:active={state.blockquote} onclick={() => { editor?.chain().focus().toggleBlockquote().run(); overflowOpen = false; }}>
							<span class="material-symbols-outlined" style="font-size:16px">format_quote</span> Blockquote
						</button>
						<button class="jte-bb-dd-item" onclick={() => { editor?.chain().focus().toggleCodeBlock().run(); overflowOpen = false; }}>
							<span class="material-symbols-outlined" style="font-size:16px">code_blocks</span> Code Block
						</button>
						<button class="jte-bb-dd-item" onclick={() => { editor?.chain().focus().setHorizontalRule().run(); overflowOpen = false; }}>
							<span class="material-symbols-outlined" style="font-size:16px">horizontal_rule</span> Divider
						</button>
						<div class="jte-bb-dd-sep"></div>
						<button class="jte-bb-dd-item" onclick={() => { insertTable(); overflowOpen = false; }}>
							<span class="material-symbols-outlined" style="font-size:16px">table_chart</span> Table
						</button>
						<button class="jte-bb-dd-item" onclick={() => { insertImage(); overflowOpen = false; }}>
							<span class="material-symbols-outlined" style="font-size:16px">image</span> Image
						</button>
					</div>
				{/if}
			</div>
		{:else}
			<button class="jte-bb" class:active={state.bulletList} title="Bullet List" onclick={() => toggleList("bullet")}>
				<span class="material-symbols-outlined">format_list_bulleted</span>
			</button>
			<button class="jte-bb" class:active={state.orderedList} title="Ordered List" onclick={() => toggleList("ordered")}>
				<span class="material-symbols-outlined">format_list_numbered</span>
			</button>
			<button class="jte-bb" class:active={state.code} title="Inline Code" onclick={() => toggleMark("code")}>
				<span class="material-symbols-outlined">code</span>
			</button>
			<button class="jte-bb" class:active={state.blockquote} title="Blockquote" onclick={() => editor?.chain().focus().toggleBlockquote().run()}>
				<span class="material-symbols-outlined">format_quote</span>
			</button>
			<button class="jte-bb" title="Code Block" onclick={() => editor?.chain().focus().toggleCodeBlock().run()}>
				<span class="material-symbols-outlined">code_blocks</span>
			</button>
			<button class="jte-bb" title="Divider" onclick={() => editor?.chain().focus().setHorizontalRule().run()}>
				<span class="material-symbols-outlined">horizontal_rule</span>
			</button>
			<button class="jte-bb" title="Insert Table" onclick={insertTable}>
				<span class="material-symbols-outlined">table_chart</span>
			</button>
			<button class="jte-bb" title="Insert Image" onclick={insertImage}>
				<span class="material-symbols-outlined">image</span>
			</button>
		{/if}

		<!-- Table tools (conditional) -->
		{#if state.table}
			<span class="jte-bb-sep"></span>
			<div class="jte-bb-wrap">
				<button class="jte-bb" title="Table" onclick={() => togglePopup("table")}>
					<span class="material-symbols-outlined">table_chart</span>
					<span class="material-symbols-outlined" style="font-size:12px">expand_more</span>
				</button>
				{#if openPopup === "table"}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="jte-bb-dropdown jte-bb-dropdown-right" onclick={handlePopupClick}>
						<button class="jte-bb-dd-item" onclick={() => tableAction("addRowAbove")}>Insert Row Above</button>
						<button class="jte-bb-dd-item" onclick={() => tableAction("addRowBelow")}>Insert Row Below</button>
						<button class="jte-bb-dd-item" onclick={() => tableAction("deleteRow")}>Delete Row</button>
						<div class="jte-bb-dd-sep"></div>
						<button class="jte-bb-dd-item" onclick={() => tableAction("addColLeft")}>Insert Column Left</button>
						<button class="jte-bb-dd-item" onclick={() => tableAction("addColRight")}>Insert Column Right</button>
						<button class="jte-bb-dd-item" onclick={() => tableAction("deleteCol")}>Delete Column</button>
						{#if state.canMerge}
							<div class="jte-bb-dd-sep"></div>
							<button class="jte-bb-dd-item" onclick={() => tableAction("mergeCells")}>Merge Cells</button>
						{/if}
						{#if state.canSplit}
							{#if !state.canMerge}<div class="jte-bb-dd-sep"></div>{/if}
							<button class="jte-bb-dd-item" onclick={() => tableAction("splitCell")}>Split Cell</button>
						{/if}
						<div class="jte-bb-dd-sep"></div>
						<button class="jte-bb-dd-item jte-bb-dd-danger" onclick={() => tableAction("deleteTable")}>Delete Table</button>
					</div>
				{/if}
			</div>
		{/if}

		<!-- AI actions -->
		{#if aiActions.length > 0}
			<span class="jte-bb-sep"></span>
			{#if aiGenerating}
				<button class="jte-bb jte-bb-ai-stop" title="Stop generating" onclick={() => onaistop?.()}>
					<span class="material-symbols-outlined">stop_circle</span>
				</button>
			{:else}
				<div class="jte-bb-wrap">
					<button class="jte-bb jte-bb-ai" title="AI actions" onclick={() => togglePopup("ai")}>
						<span class="material-symbols-outlined">auto_awesome</span>
					</button>
					{#if openPopup === "ai"}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="jte-bb-dropdown jte-bb-dropdown-right" onclick={handlePopupClick}>
							{#each aiActions as action}
								<button class="jte-bb-dd-item jte-bb-dd-ai" onclick={() => { onaiaction?.(action); closePopups(); }}>
									<span class="material-symbols-outlined" style="font-size:16px">{action.icon}</span> {action.label}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{/if}

		<!-- Pin toggle -->
		<button class="jte-bb jte-bb-pin" class:active={pinned} title={pinned ? "Unpin toolbar" : "Pin toolbar"} onclick={() => onpin?.()}>
			<span class="material-symbols-outlined">push_pin</span>
		</button>
	</div>
{/if}

<style>
	.jte-bubble {
		display: flex;
		align-items: center;
		gap: 1px;
		padding: 3px 4px;
		background: var(--jte-menubar-bg, #2a2a2a);
		border: 1px solid var(--jte-border, #444);
		border-radius: 6px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
		user-select: none;
	}

	.jte-bubble-pinned {
		border-radius: 0;
		box-shadow: none;
		border: none;
		border-bottom: 1px solid var(--jte-border, #444);
		padding: 2px 6px;
		flex-wrap: nowrap;
		justify-content: center;
		position: relative;
	}

	.jte-bubble-pinned .jte-bb-pin {
		position: absolute;
		right: 6px;
		top: 50%;
		transform: translateY(-50%);
	}

	.jte-bb {
		display: flex;
		align-items: center;
		gap: 2px;
		background: transparent;
		border: none;
		color: var(--jte-toolbar-fg, #aaa);
		padding: 4px 5px;
		cursor: pointer;
		border-radius: 4px;
		line-height: 1;
		flex-shrink: 0;
	}

	.jte-bb:hover {
		background: var(--jte-toolbar-hover, #3a3a3a);
		color: var(--jte-fg, #d4d4d4);
	}

	.jte-bb.active {
		color: var(--jte-accent, #569cd6);
		background: rgba(86, 156, 214, 0.12);
	}

	.jte-bb .material-symbols-outlined {
		font-size: 16px;
	}

	.jte-bb-sep {
		width: 1px;
		height: 16px;
		background: var(--jte-border, #444);
		margin: 0 2px;
		flex-shrink: 0;
	}

	.jte-bb-wrap {
		position: relative;
		flex-shrink: 0;
	}

	.jte-bb-dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		min-width: 70px;
		background: var(--jte-menubar-bg, #2a2a2a);
		border: 1px solid var(--jte-border, #444);
		border-radius: 6px;
		padding: 4px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
		z-index: 100;
		font-family: var(--jte-ui-font, system-ui, -apple-system, sans-serif);
		font-size: 12px;
	}

	.jte-bb-dd-item {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 4px 8px;
		background: transparent;
		border: none;
		color: var(--jte-toolbar-fg, #ccc);
		cursor: pointer;
		font-family: var(--jte-ui-font, system-ui, sans-serif);
		font-size: 12px;
		text-align: left;
		border-radius: 3px;
		white-space: nowrap;
	}

	.jte-bb-dd-item:hover {
		background: var(--jte-toolbar-hover, #3a3a3a);
	}

	.jte-bb-dd-item.active {
		color: var(--jte-accent, #569cd6);
	}

	.jte-bb-dd-block {
		min-width: 140px;
	}

	.jte-bb-dropdown-right {
		right: 0;
		left: auto;
	}

	.jte-bb-dd-sep {
		height: 1px;
		background: var(--jte-border, #444);
		margin: 3px 0;
	}

	.jte-bb-dd-danger {
		color: #e06c75;
	}

	.jte-bb-dd-danger:hover {
		background: rgba(224, 108, 117, 0.12);
	}

	/* Text color / highlight: icon stacked above color bar */
	.jte-bb-color-stack {
		flex-direction: column;
		gap: 0;
		padding: 3px 5px 2px;
	}

	.jte-bb-color-icon {
		font-size: 14px;
		font-weight: 700;
		line-height: 1;
	}

	.jte-bb-color-icon.material-symbols-outlined {
		font-size: 14px;
		font-weight: 400;
	}

	.jte-bb-color-bar {
		width: 14px;
		height: 3px;
		border-radius: 1px;
		flex-shrink: 0;
	}

	/* Color picker popup — user-select: text overrides inherited none (auto can't) */
	.jte-bb-color-panel {
		padding: 8px;
		min-width: auto;
		user-select: text;
	}

	.jte-bb-color-panel :global(hex-color-picker) {
		width: 180px;
		height: 140px;
	}

	.jte-bb-swatches {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 2px;
		margin-top: 6px;
	}

	.jte-bb-swatch {
		width: 100%;
		aspect-ratio: 1;
		border: none;
		border-radius: 2px;
		cursor: pointer;
		padding: 0;
	}

	.jte-bb-swatch:hover {
		outline: 2px solid var(--jte-fg, #d4d4d4);
		outline-offset: -1px;
		z-index: 1;
	}

	/* Overflow panel */
	.jte-bb-overflow-panel {
		min-width: 150px;
	}

	.jte-bb-overflow-row {
		display: flex;
		align-items: center;
		gap: 1px;
		padding: 2px 0;
	}

	/* Font size split: input + arrow */
	.jte-bb-split {
		display: flex;
		align-items: center;
	}

	.jte-bb-size-input {
		width: 30px;
		padding: 3px 2px 3px 5px;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 4px 0 0 4px;
		color: var(--jte-toolbar-fg, #aaa);
		font-family: var(--jte-ui-font, system-ui, sans-serif);
		font-size: 11px;
		line-height: 1;
		text-align: center;
		outline: none;
	}

	.jte-bb-size-input:hover {
		border-color: var(--jte-border, #444);
	}

	.jte-bb-size-input:focus {
		border-color: var(--jte-accent, #569cd6);
		color: var(--jte-fg, #d4d4d4);
		background: var(--jte-input-focus-bg, rgba(255,255,255,0.06));
	}

	.jte-bb-split-arrow {
		padding: 4px 2px;
		border-radius: 0 4px 4px 0;
	}

	/* AI button */
	.jte-bb-ai .material-symbols-outlined {
		color: var(--jte-accent, #569cd6);
	}

	.jte-bb-dd-ai .material-symbols-outlined {
		color: var(--jte-accent, #569cd6);
	}

	.jte-bb-ai-stop .material-symbols-outlined {
		color: #e06c75;
	}

	@keyframes jte-ai-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.jte-bb-ai-stop {
		animation: jte-ai-pulse 1.2s ease-in-out infinite;
	}

	/* Spacing panel */
	.jte-bb-spacing-panel {
		padding: 6px;
		min-width: auto;
	}

	.jte-bb-dd-label {
		font-size: 10px;
		color: var(--jte-status-fg, #888);
		padding: 2px 6px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		font-family: inherit;
	}

	.jte-bb-spacing-row {
		display: flex;
		gap: 2px;
		padding: 2px 4px;
	}

	.jte-bb-chip {
		padding: 3px 7px;
		background: transparent;
		border: 1px solid var(--jte-border, #444);
		border-radius: 3px;
		color: var(--jte-toolbar-fg, #aaa);
		font-size: 12px;
		cursor: pointer;
		font-family: inherit;
		line-height: 1;
	}

	.jte-bb-chip:hover {
		background: var(--jte-toolbar-hover, #3a3a3a);
		color: var(--jte-fg, #d4d4d4);
	}

	.jte-bb-chip.active {
		color: var(--jte-accent, #569cd6);
		border-color: var(--jte-accent, #569cd6);
		background: rgba(86, 156, 214, 0.12);
	}
</style>
