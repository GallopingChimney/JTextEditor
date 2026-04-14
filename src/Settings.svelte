<script>
	import "vanilla-colorful/hex-color-picker.js";
	import { editorDefaults, aiDefaults, providerPresets, lineHeights } from "./lib/settings-defaults.js";

	let {
		settings = {},
		aiSettings = undefined,
		layout = "widget",
		onsettingschange = undefined,
		onaisettingschange = undefined,
		onclose = undefined,
	} = $props();

	// Merge incoming settings with defaults for display
	let s = $derived({ ...editorDefaults, ...settings });
	let ai = $derived({ ...aiDefaults, ...aiSettings });

	function set(key, value) {
		onsettingschange?.({ ...s, [key]: value });
	}

	function setAi(key, value) {
		const next = { ...ai, [key]: value };
		// Auto-fill endpoint/model from presets when switching provider
		if (key === "provider" && value !== "none" && providerPresets[value]) {
			const preset = providerPresets[value];
			if (!next.endpoint || providerPresets[ai.provider]?.endpoint === next.endpoint) next.endpoint = preset.endpoint;
			if (!next.model || providerPresets[ai.provider]?.model === next.model) next.model = preset.model;
		}
		onaisettingschange?.(next);
	}

	// Color picker action (vanilla-colorful uses custom events)
	function pickerAction(node, callback) {
		const handler = (e) => callback(e.detail.value);
		node.addEventListener("color-changed", handler);
		return { destroy() { node.removeEventListener("color-changed", handler); } };
	}

	// Color picker popover state
	let openColorPicker = $state(null);

	function toggleColor(id) {
		openColorPicker = openColorPicker === id ? null : id;
	}

	$effect(() => {
		if (!openColorPicker) return;
		function onClick(e) {
			if (!e.target.closest('.jte-s-color-popover') && !e.target.closest('.jte-s-color-swatch')) {
				openColorPicker = null;
			}
		}
		document.addEventListener('click', onClick, true);
		return () => document.removeEventListener('click', onClick, true);
	});
</script>

<div class="jte-settings" class:jte-s-page={layout === 'page'}>
	<div class="jte-s-header">
		<h2>Settings</h2>
		{#if onclose}
			<button class="jte-s-close" onclick={onclose}>
				<span class="material-symbols-outlined">close</span>
			</button>
		{/if}
	</div>

	<div class="jte-s-scroll">
		<!-- General -->
		<details class="jte-s-section" open>
			<summary class="jte-s-title">
				<span class="material-symbols-outlined jte-s-icon jte-s-icon-general">settings</span>
				<span class="jte-s-title-text">General</span>
				<span class="material-symbols-outlined jte-s-chevron">expand_more</span>
			</summary>
			<div class="jte-s-body">

			<div class="jte-s-row">
				<span class="jte-s-label">Theme</span>
				<div class="jte-s-seg">
					<button class:active={s.theme === 'dark'} onclick={() => set('theme', 'dark')}>
						<span class="material-symbols-outlined">dark_mode</span> Dark
					</button>
					<button class:active={s.theme === 'light'} onclick={() => set('theme', 'light')}>
						<span class="material-symbols-outlined">light_mode</span> Light
					</button>
				</div>
			</div>

			<div class="jte-s-row">
				<span class="jte-s-label">Default mode</span>
				<div class="jte-s-seg">
					<button class:active={s.defaultMode === 'rich'} onclick={() => set('defaultMode', 'rich')}>Rich Text</button>
					<button class:active={s.defaultMode === 'plain'} onclick={() => set('defaultMode', 'plain')}>Code</button>
				</div>
			</div>

			<div class="jte-s-row">
				<span class="jte-s-label">Background</span>
				<div class="jte-s-color-wrap">
					{#if s.bgColor}
						<button class="jte-s-color-inline-reset" title="Reset to default" onclick={() => set('bgColor', '')}>
							<span class="material-symbols-outlined">restart_alt</span>
						</button>
					{/if}
					<button
						class="jte-s-color-swatch"
						title="Background color"
						style:background={s.bgColor || (s.theme === 'dark' ? '#1e1e1e' : '#ffffff')}
						onclick={() => toggleColor('bg')}
					></button>
					{#if openColorPicker === 'bg'}
						<div class="jte-s-color-popover">
							<hex-color-picker use:pickerAction={(v) => set('bgColor', v)} color={s.bgColor || (s.theme === 'dark' ? '#1e1e1e' : '#ffffff')}></hex-color-picker>
							{#if s.bgColor}
								<button class="jte-s-color-reset" onclick={() => set('bgColor', '')}>Reset</button>
							{/if}
						</div>
					{/if}
				</div>
			</div>
			</div>
		</details>

		<!-- Editor -->
		<details class="jte-s-section" open>
			<summary class="jte-s-title">
				<span class="material-symbols-outlined jte-s-icon jte-s-icon-editor">code</span>
				<span class="jte-s-title-text">Editor</span>
				<span class="material-symbols-outlined jte-s-chevron">expand_more</span>
			</summary>
			<div class="jte-s-body">

			<div class="jte-s-row">
				<span class="jte-s-label">Font</span>
				<input
					class="jte-s-input"
					type="text"
					placeholder="Consolas, 'Courier New', monospace"
					value={s.fontFamily}
					onchange={(e) => set('fontFamily', e.target.value.trim())}
				/>
			</div>

			<div class="jte-s-row">
				<span class="jte-s-label">Font size</span>
				<div class="jte-s-num-wrap">
					<button class="jte-s-num-btn" onclick={() => { const n = Math.max(8, (parseInt(s.fontSize) || 14) - 1); set('fontSize', n + 'px'); }}>
						<span class="material-symbols-outlined">remove</span>
					</button>
					<input
						class="jte-s-num"
						type="number"
						min="8"
						max="96"
						value={parseInt(s.fontSize) || 14}
						onchange={(e) => set('fontSize', Math.min(96, Math.max(8, parseInt(e.target.value) || 14)) + 'px')}
					/>
					<button class="jte-s-num-btn" onclick={() => { const n = Math.min(96, (parseInt(s.fontSize) || 14) + 1); set('fontSize', n + 'px'); }}>
						<span class="material-symbols-outlined">add</span>
					</button>
				</div>
			</div>

			<div class="jte-s-row">
				<span class="jte-s-label">Indent</span>
				<div class="jte-s-seg">
					<button class:active={s.tabSize === 2} onclick={() => set('tabSize', 2)}>2 spaces</button>
					<button class:active={s.tabSize === 4} onclick={() => set('tabSize', 4)}>4 spaces</button>
				</div>
			</div>

			<div class="jte-s-row">
				<span class="jte-s-label">Line height</span>
				<select class="jte-s-select" value={s.lineHeight} onchange={(e) => set('lineHeight', e.target.value)}>
					{#each lineHeights as lh}
						<option value={lh.value}>{lh.label} ({lh.value})</option>
					{/each}
				</select>
			</div>

			<div class="jte-s-toggles">
				<label class="jte-s-toggle-row">
					<span>Line numbers</span>
					<input type="checkbox" class="jte-s-toggle" checked={s.showLineNumbers} onchange={() => set('showLineNumbers', !s.showLineNumbers)} />
				</label>
				<label class="jte-s-toggle-row">
					<span>Invisibles</span>
					<input type="checkbox" class="jte-s-toggle" checked={s.showInvisibles} onchange={() => set('showInvisibles', !s.showInvisibles)} />
				</label>
				<label class="jte-s-toggle-row">
					<span>Word wrap</span>
					<input type="checkbox" class="jte-s-toggle" checked={s.wordWrap} onchange={() => set('wordWrap', !s.wordWrap)} />
				</label>
				<label class="jte-s-toggle-row">
					<span>Highlight active line</span>
					<input type="checkbox" class="jte-s-toggle" checked={s.highlightLine} onchange={() => set('highlightLine', !s.highlightLine)} />
				</label>
				<label class="jte-s-toggle-row">
					<span>Indent guides</span>
					<input type="checkbox" class="jte-s-toggle" checked={s.showIndentGuides} onchange={() => set('showIndentGuides', !s.showIndentGuides)} />
				</label>
			</div>
			</div>
		</details>

		<!-- Rich Text -->
		<details class="jte-s-section" open>
			<summary class="jte-s-title">
				<span class="material-symbols-outlined jte-s-icon jte-s-icon-richtext">edit_note</span>
				<span class="jte-s-title-text">Rich Text</span>
				<span class="material-symbols-outlined jte-s-chevron">expand_more</span>
			</summary>
			<div class="jte-s-body">

			<div class="jte-s-row">
				<span class="jte-s-label">Page width</span>
				<div class="jte-s-seg">
					<button class:active={s.pageWidth === 'narrow'} onclick={() => set('pageWidth', 'narrow')} title="Narrow">
						<span class="material-symbols-outlined">crop_9_16</span>
					</button>
					<button class:active={s.pageWidth === 'normal'} onclick={() => set('pageWidth', 'normal')} title="Normal">
						<span class="material-symbols-outlined">crop_square</span>
					</button>
					<button class:active={s.pageWidth === 'wide'} onclick={() => set('pageWidth', 'wide')} title="Wide">
						<span class="material-symbols-outlined">crop_16_9</span>
					</button>
					<button class:active={s.pageWidth === 'full'} onclick={() => set('pageWidth', 'full')} title="Full">
						<span class="material-symbols-outlined">open_in_full</span>
					</button>
				</div>
			</div>

			<div class="jte-s-row">
				<span class="jte-s-label">Toolbar</span>
				<div class="jte-s-seg">
					<button class:active={s.toolbarMode === 'pinned'} onclick={() => set('toolbarMode', 'pinned')}>Pinned</button>
					<button class:active={s.toolbarMode === 'bubble'} onclick={() => set('toolbarMode', 'bubble')}>Bubble</button>
				</div>
			</div>

			<div class="jte-s-row">
				<span class="jte-s-label">Page color</span>
				<div class="jte-s-color-wrap">
					{#if s.pageColor}
						<button class="jte-s-color-inline-reset" title="Reset to default" onclick={() => set('pageColor', '')}>
							<span class="material-symbols-outlined">restart_alt</span>
						</button>
					{/if}
					<button
						class="jte-s-color-swatch"
						title="Page color"
						style:background={s.pageColor || (s.theme === 'dark' ? '#252525' : '#f3f3f3')}
						onclick={() => toggleColor('page')}
					></button>
					{#if openColorPicker === 'page'}
						<div class="jte-s-color-popover">
							<hex-color-picker use:pickerAction={(v) => set('pageColor', v)} color={s.pageColor || (s.theme === 'dark' ? '#252525' : '#f3f3f3')}></hex-color-picker>
							{#if s.pageColor}
								<button class="jte-s-color-reset" onclick={() => set('pageColor', '')}>Reset</button>
							{/if}
						</div>
					{/if}
				</div>
			</div>
			</div>
		</details>

		<!-- AI -->
		{#if aiSettings !== undefined}
			<details class="jte-s-section" open>
				<summary class="jte-s-title">
					<span class="material-symbols-outlined jte-s-icon jte-s-icon-ai">auto_awesome</span>
					<span class="jte-s-title-text">AI</span>
					<span class="material-symbols-outlined jte-s-chevron">expand_more</span>
				</summary>
				<div class="jte-s-body">

				<div class="jte-s-row">
					<span class="jte-s-label">Provider</span>
					<select class="jte-s-select" value={ai.provider} onchange={(e) => setAi('provider', e.target.value)}>
						<option value="none">None</option>
						<option value="anthropic">Anthropic</option>
						<option value="openai">OpenAI</option>
						<option value="ollama">Ollama</option>
						<option value="custom">Custom</option>
					</select>
				</div>

				{#if ai.provider !== 'none'}
					{#if ai.provider !== 'anthropic'}
						<div class="jte-s-row">
							<span class="jte-s-label">Endpoint</span>
							<input
								class="jte-s-input"
								type="text"
								placeholder={providerPresets[ai.provider]?.endpoint || 'https://...'}
								value={ai.endpoint}
								onchange={(e) => setAi('endpoint', e.target.value.trim())}
							/>
						</div>
					{/if}

					{#if ai.provider !== 'ollama'}
						<div class="jte-s-row">
							<span class="jte-s-label">API key</span>
							<input
								class="jte-s-input"
								type="password"
								placeholder="sk-..."
								value={ai.apiKey}
								onchange={(e) => setAi('apiKey', e.target.value.trim())}
							/>
						</div>
					{/if}

					<div class="jte-s-row">
						<span class="jte-s-label">Model</span>
						<input
							class="jte-s-input"
							type="text"
							placeholder={providerPresets[ai.provider]?.model || 'model-name'}
							value={ai.model}
							onchange={(e) => setAi('model', e.target.value.trim())}
						/>
					</div>
				{/if}
				</div>
			</details>
		{/if}
	</div>
</div>

<style>
	.jte-settings {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--jte-menubar-bg, #252525);
		color: var(--jte-fg, #d4d4d4);
		font-family: var(--jte-ui-font, system-ui, -apple-system, sans-serif);
		font-size: 13px;
		padding: 0 10px;
	}

	.jte-s-page {
		max-width: 640px;
		margin: 0 auto;
		width: 100%;
		padding: 0 24px;
	}

	.jte-s-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 2px 6px;
		flex-shrink: 0;
	}

	.jte-s-header h2 {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--jte-status-fg, #888);
	}

	.jte-s-close {
		display: flex;
		align-items: center;
		background: transparent;
		border: none;
		color: var(--jte-toolbar-fg, #aaa);
		cursor: pointer;
		padding: 4px;
		border-radius: 6px;
	}

	.jte-s-close:hover {
		background: var(--jte-toolbar-hover, #333);
		color: var(--jte-fg, #d4d4d4);
	}

	.jte-s-close .material-symbols-outlined {
		font-size: 20px;
	}

	.jte-s-scroll {
		flex: 1;
		overflow-y: auto;
		padding-bottom: 24px;
	}

	/* Sections */
	.jte-s-section {
		border-bottom: 1px solid var(--jte-border, #2a2a2a);
		padding: 4px 0;
	}

	.jte-s-title {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 4px;
		cursor: pointer;
		list-style: none;
		user-select: none;
	}

	.jte-s-title::-webkit-details-marker { display: none; }
	.jte-s-title::marker { content: ''; }

	.jte-s-icon {
		font-size: 16px;
	}

	.jte-s-icon-general { color: var(--jte-fg, #d4d4d4); }
	.jte-s-icon-editor { color: #e5a045; }
	.jte-s-icon-richtext { color: var(--jte-accent, #569cd6); }
	.jte-s-icon-ai {
		background: linear-gradient(135deg, #a855f7, #f97316);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.jte-s-title-text {
		font-size: 13px;
		font-weight: 600;
		color: var(--jte-fg, #d4d4d4);
	}

	.jte-s-chevron {
		font-size: 18px;
		color: var(--jte-status-fg, #555);
		transition: transform 0.15s;
		margin-left: -2px;
	}

	.jte-s-section[open] > .jte-s-title .jte-s-chevron {
		transform: rotate(0deg);
	}

	.jte-s-section:not([open]) > .jte-s-title .jte-s-chevron {
		transform: rotate(-90deg);
	}

	.jte-s-title:hover .jte-s-chevron {
		color: var(--jte-toolbar-fg, #aaa);
	}

	.jte-s-body {
		padding: 2px 0 8px;
	}

	/* Rows */
	.jte-s-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 2px 4px;
		min-height: 30px;
	}

	.jte-s-label {
		color: var(--jte-status-fg, #888);
		font-size: 12px;
		flex-shrink: 0;
		margin-right: 12px;
	}

	/* Shared control dimensions */
	/* All interactive controls: 28px height, 6px border-radius, 12px font */

	/* Segmented Control */
	.jte-s-seg {
		display: inline-flex;
		height: 28px;
		border: 1px solid var(--jte-border, #3a3a3a);
		border-radius: 6px;
		overflow: hidden;
		background: var(--jte-bg, #1e1e1e);
	}

	.jte-s-seg button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		padding: 0 10px;
		height: 100%;
		background: transparent;
		border: none;
		color: var(--jte-toolbar-fg, #aaa);
		cursor: pointer;
		font-family: inherit;
		font-size: 12px;
		white-space: nowrap;
		transition: background 0.15s, color 0.15s;
	}

	.jte-s-seg button + button {
		border-left: 1px solid var(--jte-border, #3a3a3a);
	}

	.jte-s-seg button:hover {
		background: var(--jte-toolbar-hover, #333);
	}

	.jte-s-seg button.active {
		background: rgba(86, 156, 214, 0.15);
		color: var(--jte-accent, #569cd6);
	}

	.jte-s-seg button .material-symbols-outlined {
		font-size: 14px;
	}

	/* Select */
	.jte-s-select {
		height: 28px;
		background: var(--jte-bg, #1e1e1e);
		border: 1px solid var(--jte-border, #3a3a3a);
		border-radius: 6px;
		color: var(--jte-fg, #d4d4d4);
		padding: 0 8px;
		font-family: inherit;
		font-size: 12px;
		outline: none;
		cursor: pointer;
		min-width: 120px;
	}

	.jte-s-select:focus {
		border-color: var(--jte-accent, #569cd6);
	}

	.jte-s-select option {
		background: var(--jte-menubar-bg, #252525);
		color: var(--jte-fg, #d4d4d4);
	}

	/* Number input with stepper */
	.jte-s-num-wrap {
		display: inline-flex;
		align-items: center;
		height: 28px;
		border: 1px solid var(--jte-border, #3a3a3a);
		border-radius: 6px;
		overflow: hidden;
		background: var(--jte-bg, #1e1e1e);
	}

	.jte-s-num-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 100%;
		background: transparent;
		border: none;
		color: var(--jte-toolbar-fg, #aaa);
		cursor: pointer;
	}

	.jte-s-num-btn:hover {
		background: var(--jte-toolbar-hover, #333);
		color: var(--jte-fg, #d4d4d4);
	}

	.jte-s-num-btn .material-symbols-outlined {
		font-size: 14px;
	}

	.jte-s-num {
		width: 36px;
		height: 100%;
		text-align: center;
		background: transparent;
		border: none;
		border-left: 1px solid var(--jte-border, #3a3a3a);
		border-right: 1px solid var(--jte-border, #3a3a3a);
		color: var(--jte-fg, #d4d4d4);
		font-family: inherit;
		font-size: 12px;
		padding: 0;
		outline: none;
		-moz-appearance: textfield;
	}

	.jte-s-num::-webkit-outer-spin-button,
	.jte-s-num::-webkit-inner-spin-button {
		-webkit-appearance: none;
	}

	/* Text input */
	.jte-s-input {
		height: 28px;
		background: var(--jte-bg, #1e1e1e);
		border: 1px solid var(--jte-border, #3a3a3a);
		border-radius: 6px;
		color: var(--jte-fg, #d4d4d4);
		padding: 0 10px;
		font-family: inherit;
		font-size: 12px;
		outline: none;
		min-width: 0;
		flex: 1;
		max-width: 240px;
	}

	.jte-s-input:focus {
		border-color: var(--jte-accent, #569cd6);
	}

	.jte-s-input::placeholder {
		color: var(--jte-status-fg, #666);
	}

	/* Toggle switches */
	.jte-s-toggles {
		padding: 2px 0;
	}

	.jte-s-toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 2px 4px;
		min-height: 28px;
		cursor: pointer;
		border-radius: 6px;
	}

	.jte-s-toggle-row:hover {
		background: var(--jte-toolbar-hover, #2a2a2a);
	}

	.jte-s-toggle-row span {
		font-size: 12px;
		color: var(--jte-status-fg, #888);
	}

	.jte-s-toggle {
		appearance: none;
		-webkit-appearance: none;
		width: 30px;
		height: 16px;
		background: var(--jte-border, #3a3a3a);
		border-radius: 8px;
		position: relative;
		cursor: pointer;
		transition: background 0.2s;
		flex-shrink: 0;
	}

	.jte-s-toggle::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 12px;
		height: 12px;
		background: var(--jte-fg, #d4d4d4);
		border-radius: 50%;
		transition: transform 0.2s;
	}

	.jte-s-toggle:checked {
		background: var(--jte-accent, #569cd6);
	}

	.jte-s-toggle:checked::after {
		transform: translateX(14px);
	}

	/* Color pickers */
	.jte-s-color-wrap {
		position: relative;
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.jte-s-color-inline-reset {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		padding: 0;
		border: none;
		border-radius: 5px;
		background: transparent;
		color: var(--jte-status-fg, #888);
		cursor: pointer;
		transition: color 0.15s;
	}

	.jte-s-color-inline-reset .material-symbols-outlined {
		font-size: 16px;
	}

	.jte-s-color-inline-reset:hover {
		color: var(--jte-fg, #d4d4d4);
	}

	.jte-s-color-swatch {
		width: 22px;
		height: 22px;
		border-radius: 5px;
		border: 1px solid var(--jte-border, #3a3a3a);
		cursor: pointer;
		padding: 0;
		transition: border-color 0.15s;
	}

	.jte-s-color-swatch:hover {
		border-color: var(--jte-toolbar-fg, #aaa);
	}

	.jte-s-color-popover {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		z-index: 400;
		background: var(--jte-menubar-bg, #252525);
		border: 1px solid var(--jte-border, #3a3a3a);
		border-radius: 10px;
		padding: 12px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: center;
	}

	.jte-s-color-popover :global(hex-color-picker) {
		width: 180px;
		height: 150px;
	}

	.jte-s-color-reset {
		background: transparent;
		border: 1px solid var(--jte-border, #3a3a3a);
		border-radius: 4px;
		color: var(--jte-toolbar-fg, #aaa);
		font-family: inherit;
		font-size: 11px;
		padding: 3px 10px;
		cursor: pointer;
	}

	.jte-s-color-reset:hover {
		background: var(--jte-toolbar-hover, #333);
		color: var(--jte-fg, #d4d4d4);
	}

	/* Scrollbar — thin thumb hugging right edge, full-width hover target */
	.jte-s-scroll::-webkit-scrollbar {
		width: 6px;
	}

	.jte-s-scroll::-webkit-scrollbar-track {
		background: transparent;
	}

	.jte-s-scroll::-webkit-scrollbar-thumb {
		background: var(--jte-scrollbar-thumb, rgba(255, 255, 255, 0.2));
		border-radius: 3px;
		border-left: 3px solid transparent;
		background-clip: padding-box;
	}

	.jte-s-scroll::-webkit-scrollbar-thumb:hover {
		background: var(--jte-scrollbar-thumb-hover, rgba(255, 255, 255, 0.35));
		border-left: 3px solid transparent;
		background-clip: padding-box;
	}
</style>
