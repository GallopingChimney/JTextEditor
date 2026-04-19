<script lang="ts">
	// ============================================================
	//  EdgePanel — collapsible + resizable edge panel
	//  Headless by default; pass `styled` for the built-in look.
	//  Parent element MUST be `position: relative` (overlay mode)
	//  or a flexbox matching the edge orientation (push mode).
	// ============================================================

	import type { Snippet } from 'svelte';

	type Edge = 'left' | 'right' | 'top' | 'bottom';

	let {
		open = $bindable(true),
		size = $bindable(220),
		edge = 'left',
		mode = 'push',
		min = 64,
		max = 600,
		snapAt = undefined,
		hintSize = 6,
		hintHitSize = undefined,
		collapsedType = 'hidden',
		handleSize = 4,
		handleHitSize = undefined,
		styled = false,
		class: className = '',
		handleClass = '',
		hintClass = '',
		children,
	}: {
		open?: boolean;
		size?: number;
		edge?: Edge;
		/**
		 * 'overlay' — absolute-positioned over siblings (parent needs `position: relative`).
		 * 'push' — flex item that reflows siblings (parent must be a flexbox: row for left/right, col for top/bottom).
		 */
		mode?: 'overlay' | 'push';
		min?: number;
		max?: number;
		/**
		 * Snap-to-close threshold in px. When dragging the handle, if the pointer-target
		 * size drops below this, snap arms (exposed via `.snapping` on the handle and
		 * `[data-snapping]` on the panel). Releasing while armed closes the panel and
		 * restores `size` to its pre-drag value; unarming mid-drag cancels the snap.
		 * Unset = disabled.
		 */
		snapAt?: number;
		hintSize?: number;
		/** Invisible hit area thickness for the closed-state hint, in px.
		 *  Defaults to 2× hintSize. Widens the click target without enlarging
		 *  the visible accent line. */
		hintHitSize?: number;
		/**
		 * Closed-state appearance:
		 * - 'hidden' (default): invisible; hover surfaces a 2px edge accent + chevron.
		 *   Hit area is `hintHitSize` (defaults to 2× hintSize), takes zero layout space.
		 * - 'bar': always-visible 48×2px centered indicator. Takes 6px of layout
		 *   space in push mode. Click to open, or drag to reopen and resize live.
		 */
		collapsedType?: 'hidden' | 'bar';
		handleSize?: number;
		/** Invisible hit area around the handle, in px. Defaults to handleSize.
		 *  Set larger than handleSize to widen the grab zone without enlarging
		 *  the visible accent line. */
		handleHitSize?: number;
		/** Apply the built-in default look. User classes still compose on top. */
		styled?: boolean;
		class?: string;
		handleClass?: string;
		hintClass?: string;
		children: Snippet;
	} = $props();

	const isVertical = $derived(edge === 'left' || edge === 'right');
	const opposite: Record<Edge, Edge> = {
		left: 'right', right: 'left', top: 'bottom', bottom: 'top',
	};

	let dragging = $state(false);
	let armed = $state(false);
	let dragStartPos = 0;
	let dragStartSize = 0;

	// During armed snap, the panel previews fully collapsed (zero size).
	// The attached-edge glow lives on the consumer's ::before pseudo, so
	// there's nothing to render inside the panel itself.
	const renderedSize = $derived(armed ? 0 : size);

	const panelStyle = $derived.by(() => {
		const dim = isVertical ? `width:${renderedSize}px` : `height:${renderedSize}px`;
		if (mode === 'push') {
			return `position:relative;flex:0 0 ${renderedSize}px;${dim};`;
		}
		const fill = isVertical ? 'top:0;bottom:0' : 'left:0;right:0';
		return `position:absolute;${edge}:0;${fill};${dim};`;
	});

	const hitSize = $derived(handleHitSize ?? handleSize);

	const handleStyle = $derived.by(() => {
		const side = opposite[edge];
		const thick = isVertical ? `width:${hitSize}px` : `height:${hitSize}px`;
		const fill = isVertical ? 'top:0;bottom:0' : 'left:0;right:0';
		const cursor = isVertical ? 'ew-resize' : 'ns-resize';
		// Center the hit area on the seam so it remains grabbable from both sides.
		const offset = `margin-${side}:-${hitSize / 2}px`;
		return `position:absolute;${side}:0;${fill};${thick};${offset};cursor:${cursor};touch-action:none;background:transparent;`;
	});

	/** Inner visible bar — centered inside the (possibly larger) hit area. */
	const handleBarStyle = $derived.by(() => {
		if (isVertical) {
			const inset = Math.max(0, (hitSize - handleSize) / 2);
			return `position:absolute;top:0;bottom:0;left:${inset}px;width:${handleSize}px;pointer-events:none;`;
		}
		const inset = Math.max(0, (hitSize - handleSize) / 2);
		return `position:absolute;left:0;right:0;top:${inset}px;height:${handleSize}px;pointer-events:none;`;
	});

	// 'hidden' hint takes zero layout space (absolute, invisible).
	// 'bar' hint takes ~6px of layout space in push mode (thin visible indicator).
	// For overlay, both are absolute. Consumer's parent must be `position: relative`
	// for the 'hidden' hint to anchor correctly.
	const hintHit = $derived(hintHitSize ?? hintSize * 2);
	const BAR_THICKNESS = 6;

	const hintStyle = $derived.by(() => {
		const reset = 'cursor:pointer;background:transparent;border:0;padding:0;touch-action:none;';
		if (collapsedType === 'bar') {
			const thick = isVertical ? `width:${BAR_THICKNESS}px` : `height:${BAR_THICKNESS}px`;
			if (mode === 'push') {
				return `position:relative;flex:0 0 ${BAR_THICKNESS}px;${thick};${reset}`;
			}
			const fill = isVertical ? 'top:0;bottom:0' : 'left:0;right:0';
			return `position:absolute;${edge}:0;${fill};${thick};z-index:20;${reset}`;
		}
		const thick = isVertical ? `width:${hintHit}px` : `height:${hintHit}px`;
		const fill = isVertical ? 'top:0;bottom:0' : 'left:0;right:0';
		return `position:absolute;${edge}:0;${fill};${thick};z-index:20;${reset}`;
	});

	// Styled-mode default classes. Minimal: chevron on the hint, blue/red states
	// on the handle, red snap-preview on the panel. No background, no border —
	// those remain the consumer's job.
	const panelClsFinal = $derived(
		styled ? `ep-styled ep-panel ${className}` : className,
	);
	const handleClsFinal = $derived(
		styled ? `ep-styled-handle z-10 ${handleClass}` : handleClass,
	);
	const hintClsFinal = $derived(
		styled ? `ep-styled ep-hint ${hintClass}` : hintClass,
	);

	function clamp(n: number) { return Math.max(min, Math.min(max, n)); }

	function onHandlePointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		e.preventDefault();
		dragging = true;
		armed = false;
		dragStartPos = isVertical ? e.clientX : e.clientY;
		dragStartSize = size;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onHandlePointerMove(e: PointerEvent) {
		if (!dragging) return;
		const delta = (isVertical ? e.clientX : e.clientY) - dragStartPos;
		// Near edges grow with positive delta; far edges grow with negative delta.
		const signed = (edge === 'left' || edge === 'top') ? delta : -delta;
		const raw = dragStartSize + signed;
		size = clamp(raw);
		armed = snapAt != null && raw < snapAt;
	}

	function onHandlePointerUp(e: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
		if (armed) {
			// Restore pre-drag size so the next open returns to where the user had it.
			size = dragStartSize;
			open = false;
		}
		armed = false;
	}

	// Hint pointer flow: click opens to previous size; drag past 2px opens live
	// and resizes as the user pulls. Uses window listeners so events keep flowing
	// after the hint button is replaced by the open panel.
	function onHintPointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		e.preventDefault();
		const startPos = isVertical ? e.clientX : e.clientY;
		const startSize = size;
		let opened = false;

		const onMove = (ev: PointerEvent) => {
			const delta = (isVertical ? ev.clientX : ev.clientY) - startPos;
			const signed = (edge === 'left' || edge === 'top') ? delta : -delta;
			if (!opened && Math.abs(signed) > 2) {
				opened = true;
				open = true;
			}
			if (opened) size = clamp(startSize + signed);
		};
		const onUp = () => {
			if (!opened) open = true; // click-to-open
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}
</script>

{#if open}
	<aside
		class={panelClsFinal}
		style={panelStyle}
		data-edge={edge}
		data-snapping={armed ? '' : undefined}
	>
		{#if !armed}
			{@render children()}
		{/if}
		<div
			role="separator"
			aria-orientation={isVertical ? 'vertical' : 'horizontal'}
			aria-label="Resize panel (double-click to collapse)"
			class="{handleClsFinal}{dragging ? ' dragging' : ''}{armed ? ' snapping' : ''}"
			style={handleStyle}
			onpointerdown={onHandlePointerDown}
			onpointermove={onHandlePointerMove}
			onpointerup={onHandlePointerUp}
			onpointercancel={onHandlePointerUp}
			ondblclick={() => { open = false; }}
		>
			<div class={styled ? 'ep-styled-bar transition-colors duration-100' : ''} style={handleBarStyle}></div>
		</div>
	</aside>
{:else}
	<button
		type="button"
		class={hintClsFinal}
		aria-label="Expand panel"
		style={hintStyle}
		data-edge={edge}
		data-collapsed={collapsedType}
		onpointerdown={onHintPointerDown}
	></button>
{/if}

<style>
	/* ============================================================
	   Styled mode — opt-in defaults gated by `.ep-styled`.
	   Mirrors JSimpleLayout's collapse-zone look: 2px accent line
	   pinned to the attached edge + a chevron glyph pointing INTO
	   the container. Armed-snap preview burns red.
	   ============================================================ */

	/* Edge-attached glow — fades in on hint hover (closed) and
	   during armed snap preview (open + dragging past snapAt). */
	:global(.ep-styled.ep-hint::before),
	:global(.ep-styled.ep-panel[data-snapping]::before) {
		content: '';
		position: absolute;
		opacity: 0;
		transition: opacity 0.12s, background-color 0.12s, box-shadow 0.12s;
		pointer-events: none;
	}

	/* Orientation (2px line) */
	:global(.ep-styled[data-edge='left']::before),
	:global(.ep-styled[data-edge='right']::before) {
		top: 0;
		bottom: 0;
		width: 2px;
	}
	:global(.ep-styled[data-edge='top']::before),
	:global(.ep-styled[data-edge='bottom']::before) {
		left: 0;
		right: 0;
		height: 2px;
	}

	/* Edge pinning */
	:global(.ep-styled[data-edge='left']::before)   { left: 0; }
	:global(.ep-styled[data-edge='right']::before)  { right: 0; }
	:global(.ep-styled[data-edge='top']::before)    { top: 0; }
	:global(.ep-styled[data-edge='bottom']::before) { bottom: 0; }

	/* Closed hint (hidden mode): accent line on hover */
	:global(.ep-styled.ep-hint[data-collapsed='hidden']::before) {
		background: #3b82f6;
		box-shadow: 0 0 8px #3b82f6, 0 0 2px #3b82f6;
	}
	:global(.ep-styled.ep-hint[data-collapsed='hidden']:hover::before) {
		opacity: 1;
	}

	/* Chevron glyph — hidden mode only. Material keyboard_arrow_right, masked
	   so it inherits currentColor and rotates per edge to point INTO the
	   container. */
	:global(.ep-styled.ep-hint[data-collapsed='hidden']::after) {
		content: '';
		position: absolute;
		inset: 0;
		margin: auto;
		width: 22px;
		height: 22px;
		background: rgb(96 165 250);
		opacity: 0;
		transition: opacity 0.12s, transform 0.12s;
		pointer-events: none;
		-webkit-mask: url('/icons/keyboard_arrow_right_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg') center / contain no-repeat;
		        mask: url('/icons/keyboard_arrow_right_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg') center / contain no-repeat;
	}
	:global(.ep-styled.ep-hint[data-collapsed='hidden']:hover::after) {
		opacity: 1;
	}

	/* Rotate chevron to point into the container. */
	:global(.ep-styled.ep-hint[data-collapsed='hidden'][data-edge='left']::after)   { transform: translateX(0px)  rotate(0deg);   }
	:global(.ep-styled.ep-hint[data-collapsed='hidden'][data-edge='right']::after)  { transform: translateX(0px)  rotate(180deg); }
	:global(.ep-styled.ep-hint[data-collapsed='hidden'][data-edge='top']::after)    { transform: translateY(0px)  rotate(90deg);  }
	:global(.ep-styled.ep-hint[data-collapsed='hidden'][data-edge='bottom']::after) { transform: translateY(0px)  rotate(-90deg); }

	/* ---- Bar mode: always-visible 48×2 centered indicator ---- */
	:global(.ep-styled.ep-hint[data-collapsed='bar']::after) {
		content: '';
		position: absolute;
		inset: 0;
		margin: auto;
		background: rgb(115 115 115);
		border-radius: 1px;
		transition: background-color 0.12s;
		pointer-events: none;
	}
	:global(.ep-styled.ep-hint[data-collapsed='bar'][data-edge='left']::after),
	:global(.ep-styled.ep-hint[data-collapsed='bar'][data-edge='right']::after) {
		width: 2px;
		height: 48px;
	}
	:global(.ep-styled.ep-hint[data-collapsed='bar'][data-edge='top']::after),
	:global(.ep-styled.ep-hint[data-collapsed='bar'][data-edge='bottom']::after) {
		width: 48px;
		height: 2px;
	}
	:global(.ep-styled.ep-hint[data-collapsed='bar']:hover::after) {
		background: rgb(59 130 246);
	}

	/* Open + armed: red preview so user knows release will close */
	:global(.ep-styled.ep-panel[data-snapping]::before) {
		background: rgb(239 68 68 / 0.9);
		box-shadow: 0 0 14px rgb(239 68 68 / 0.9);
		opacity: 1;
	}
	/* Lift armed preview above sibling overlay panels so the edge
	   line runs the full length, even where panels overlap. */
	:global(.ep-styled.ep-panel[data-snapping]) {
		z-index: 30;
	}

	/* Handle states (styled mode) — color the inner visible bar, not the
	   (potentially larger) invisible hit area. */
	:global(.ep-styled-handle:hover .ep-styled-bar) {
		background-color: rgb(59 130 246 / 0.6);
	}
	:global(.ep-styled-handle.dragging .ep-styled-bar) {
		background-color: rgb(59 130 246 / 0.8);
	}
	:global(.ep-styled-handle.snapping .ep-styled-bar) {
		background-color: rgb(239 68 68 / 0.8);
	}
</style>
