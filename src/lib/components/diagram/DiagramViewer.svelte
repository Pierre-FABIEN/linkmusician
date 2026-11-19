<script lang="ts">
	/**
	 * LINKMUSICIAN: visualiseur interactif d'un diagramme (DIAGRAM-03).
	 *
	 * Rendu SVG reconstruit depuis la géométrie du `.drawio` (aucun contenu
	 * recopié). Molette ou +/− : zoom autour du pointeur ; glisser ou flèches :
	 * déplacement ; 0 : ajuster ; Tab : nœud suivant, Entrée : sélectionner.
	 * La sélection met en évidence les relations directes ; un filtre par
	 * acteur et par type de flux atténue le reste. Plein écran natif.
	 */
	import { untrack } from 'svelte';
	import { Expand, Maximize, Minus, Plus, Shrink } from 'lucide-svelte';
	import { edgePoints, midpoint, pathOf, wrapLabel, type Box } from '#lib/diagram/geometry';
	import type { DrawioCell } from '#lib/diagram/types';
	import { DARK_TONES } from '#lib/diagram/ui';

	interface StepMeta {
		id: string;
		title: string;
		actor: string;
	}

	let {
		cells,
		width,
		height,
		steps,
		title,
		selected = null,
		actorFilter = '',
		showAlternatives = true,
		onselect
	}: {
		cells: DrawioCell[];
		width: number;
		height: number;
		steps: StepMeta[];
		title: string;
		selected?: string | null;
		actorFilter?: string;
		showAlternatives?: boolean;
		onselect: (id: string | null) => void;
	} = $props();

	const PAD = 32;
	/** En dessous, un libellé de 12 px devient illisible. */
	const READABLE = 0.7;
	let frame = $state<HTMLDivElement | null>(null);
	let viewport = $state<HTMLDivElement | null>(null);
	let scale = $state(1);
	let tx = $state(0);
	let ty = $state(0);
	let fullscreen = $state(false);
	let drag: { x: number; y: number; tx: number; ty: number; id: number; moved: boolean } | null =
		null;

	const byId = $derived(new Map(cells.map((c) => [c.id, c])));
	const stepById = $derived(new Map(steps.map((s) => [s.id, s])));
	const lanes = $derived(cells.filter((c) => c.role === 'lane' || c.role === 'group'));
	const nodes = $derived(cells.filter((c) => c.role === 'step' || c.role === 'note'));
	const edges = $derived(
		cells.filter(
			(c) =>
				c.role === 'edge' &&
				c.source &&
				c.target &&
				byId.has(c.source) &&
				byId.has(c.target) &&
				(showAlternatives || !c.dashed)
		)
	);

	/** Voisins directs du nœud choisi (arêtes entrantes et sortantes). */
	const neighbours = $derived.by((): string[] | null => {
		if (!selected) return null;
		const ids = [selected];
		for (const e of edges) {
			if (e.source === selected) ids.push(e.target!);
			if (e.target === selected) ids.push(e.source!);
		}
		return ids;
	});

	const dimNode = (id: string) => {
		if (neighbours && !neighbours.includes(id)) return true;
		const actor = stepById.get(id)?.actor;
		return Boolean(actorFilter && actor && actor !== actorFilter);
	};
	const dimEdge = (e: DrawioCell) =>
		Boolean(neighbours && !(e.source === selected || e.target === selected)) ||
		Boolean(actorFilter && (dimNode(e.source!) || dimNode(e.target!)));

	/** Ajuste tout le diagramme à la fenêtre. */
	function fit() {
		if (!viewport) return;
		const w = viewport.clientWidth;
		const h = viewport.clientHeight;
		const s = Math.min(w / (width + PAD * 2), h / (height + PAD * 2), 1.4);
		scale = Math.max(0.15, s);
		tx = (w - width * scale) / 2;
		ty = Math.max(PAD * scale, (h - height * scale) / 2);
	}

	/** Vue d'ouverture : tout le diagramme s'il reste lisible, sinon sa largeur depuis le haut. */
	function openingView() {
		fit();
		if (!viewport || scale >= READABLE) return;
		const w = viewport.clientWidth;
		scale = Math.max(READABLE, Math.min(1, w / (width + PAD * 2)));
		tx = Math.max(PAD, (w - width * scale) / 2);
		ty = PAD;
	}

	function zoomAt(factor: number, cx?: number, cy?: number) {
		if (!viewport) return;
		const x = cx ?? viewport.clientWidth / 2;
		const y = cy ?? viewport.clientHeight / 2;
		const next = Math.min(4, Math.max(0.15, scale * factor));
		tx = x - ((x - tx) * next) / scale;
		ty = y - ((y - ty) * next) / scale;
		scale = next;
	}

	/** Centre la vue sur un nœud (lien profond, sélection au clavier). */
	export function focusNode(id: string) {
		const c = byId.get(id);
		if (!c || !viewport) return;
		tx = viewport.clientWidth / 2 - (c.x + c.width / 2) * scale;
		ty = viewport.clientHeight / 2 - (c.y + c.height / 2) * scale;
	}

	$effect(() => {
		// Ajuster à l'ouverture et quand le diagramme change ; seules la taille
		// et le cadre sont suivis (l'ajustement lit et écrit le zoom).
		void width;
		void height;
		if (!viewport) return;
		untrack(() => {
			openingView();
			// La sélection initiale (lien profond) centre la vue ; les suivantes non.
			if (selected) focusNode(selected);
		});
	});

	$effect(() => {
		if (!viewport) return;
		const el = viewport;
		// Non passif : la molette zoome le diagramme au lieu de faire défiler la page.
		const onwheel = (e: WheelEvent) => {
			e.preventDefault();
			e.stopPropagation();
			const rect = el.getBoundingClientRect();
			zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
		};
		el.addEventListener('wheel', onwheel, { passive: false });
		// Le premier rappel suit l'ouverture : il garde le nœud choisi au centre.
		const onresize = () => {
			openingView();
			if (selected) focusNode(selected);
		};
		const observer = new ResizeObserver(onresize);
		observer.observe(el);
		return () => {
			el.removeEventListener('wheel', onwheel);
			observer.disconnect();
		};
	});

	$effect(() => {
		const onchange = () => {
			fullscreen = document.fullscreenElement === frame;
			requestAnimationFrame(fit);
		};
		document.addEventListener('fullscreenchange', onchange);
		return () => document.removeEventListener('fullscreenchange', onchange);
	});

	function onpointerdown(e: PointerEvent) {
		if ((e.target as Element).closest('[data-node]')) return;
		drag = { x: e.clientX, y: e.clientY, tx, ty, id: e.pointerId, moved: false };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function onpointermove(e: PointerEvent) {
		if (!drag || drag.id !== e.pointerId) return;
		const dx = e.clientX - drag.x;
		const dy = e.clientY - drag.y;
		if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
		tx = drag.tx + dx;
		ty = drag.ty + dy;
	}
	function onpointerup(e: PointerEvent) {
		if (drag && !drag.moved && !(e.target as Element).closest('[data-node]')) onselect(null);
		drag = null;
	}

	function onkeydown(e: KeyboardEvent) {
		const step = 60;
		if (e.key === '+' || e.key === '=') zoomAt(1.2);
		else if (e.key === '-') zoomAt(1 / 1.2);
		else if (e.key === '0') fit();
		else if ((e.target as Element).closest('[data-node]') && (e.key === 'Enter' || e.key === ' ')) {
			const id = (e.target as HTMLElement).closest<HTMLElement>('[data-node]')!.dataset.node!;
			onselect(selected === id ? null : id);
		} else if (e.target === viewport && e.key === 'ArrowLeft') tx += step;
		else if (e.target === viewport && e.key === 'ArrowRight') tx -= step;
		else if (e.target === viewport && e.key === 'ArrowUp') ty += step;
		else if (e.target === viewport && e.key === 'ArrowDown') ty -= step;
		else if (e.key === 'Escape' && selected) onselect(null);
		else return;
		e.preventDefault();
	}

	async function toggleFullscreen() {
		if (!frame) return;
		if (document.fullscreenElement) await document.exitFullscreen();
		else await frame.requestFullscreen?.().catch(() => undefined);
	}

	const toneOf = (c: DrawioCell) => c.tone ?? 'paper';
	const inkOf = (c: DrawioCell) => (DARK_TONES.has(toneOf(c)) ? '#fff' : 'var(--lm-ink)');
	const fillOf = (c: DrawioCell) =>
		toneOf(c) === 'paper' ? 'var(--card, var(--lm-paper))' : `var(--tone-${toneOf(c)})`;

	function lines(c: DrawioCell, size: number) {
		const ls = wrapLabel(c.label, c.width, size);
		const lh = size * 1.3;
		const top = c.y + c.height / 2 - ((ls.length - 1) * lh) / 2;
		return ls.map((text, i) => ({ text, y: top + i * lh }));
	}

	const labelOf = (id: string) => stepById.get(id)?.title ?? byId.get(id)?.label ?? id;
</script>

<div class="dg-viewer" bind:this={frame} class:is-full={fullscreen}>
	<div class="dg-viewer__tools" role="toolbar" aria-label="Affichage du diagramme">
		<button
			type="button"
			class="lm-btn"
			data-variant="ghost"
			onclick={() => zoomAt(1.2)}
			aria-label="Zoom avant"
		>
			<Plus class="size-4" aria-hidden="true" />
		</button>
		<button
			type="button"
			class="lm-btn"
			data-variant="ghost"
			onclick={() => zoomAt(1 / 1.2)}
			aria-label="Zoom arrière"
		>
			<Minus class="size-4" aria-hidden="true" />
		</button>
		<button
			type="button"
			class="lm-btn"
			data-variant="ghost"
			onclick={fit}
			aria-label="Ajuster à la fenêtre"
		>
			<Maximize class="size-4" aria-hidden="true" /><span class="dg-hide-sm">Ajuster</span>
		</button>
		<button
			type="button"
			class="lm-btn"
			data-variant="ghost"
			onclick={toggleFullscreen}
			aria-pressed={fullscreen}
			aria-label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
		>
			{#if fullscreen}<Shrink class="size-4" aria-hidden="true" />{:else}<Expand
					class="size-4"
					aria-hidden="true"
				/>{/if}
		</button>
		<span class="dg-viewer__zoom" aria-live="polite">{Math.round(scale * 100)} %</span>
	</div>

	<!-- Le cadre reçoit le focus pour se déplacer au clavier ; les nœuds sont des boutons. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<div
		class="dg-viewer__viewport"
		bind:this={viewport}
		tabindex="0"
		role="application"
		aria-roledescription="diagramme"
		aria-label="{title}. Flèches pour se déplacer, plus et moins pour zoomer, 0 pour ajuster, Tab pour parcourir les nœuds."
		{onpointerdown}
		{onpointermove}
		{onpointerup}
		onpointercancel={() => (drag = null)}
		{onkeydown}
	>
		<svg class="dg-svg" width="100%" height="100%" aria-hidden="false">
			<defs>
				<marker
					id="dg-arrow-ui"
					viewBox="0 0 10 10"
					refX="9"
					refY="5"
					markerWidth="7"
					markerHeight="7"
					orient="auto-start-reverse"
				>
					<path d="M0 0 L10 5 L0 10 z" fill="var(--lm-ink)" />
				</marker>
			</defs>
			<g transform="translate({tx} {ty}) scale({scale})">
				{#each lanes as lane (lane.id)}
					<g class="dg-lane" class:is-group={lane.role === 'group'}>
						<rect x={lane.x} y={lane.y} width={lane.width} height={lane.height} />
						<text x={lane.x + 14} y={lane.y + 22}>{lane.label}</text>
					</g>
				{/each}
				{#each edges as edge (edge.id)}
					{@const points = edgePoints(
						byId.get(edge.source!) as Box,
						byId.get(edge.target!) as Box,
						edge.points
					)}
					{@const m = midpoint(points)}
					<g
						class="dg-edge"
						class:is-dashed={edge.dashed}
						class:is-dim={dimEdge(edge)}
						class:is-hot={selected && (edge.source === selected || edge.target === selected)}
					>
						<path d={pathOf(points)} marker-end="url(#dg-arrow-ui)" />
						{#if edge.label}
							<text x={m.x} y={m.y - 8} text-anchor="middle">{edge.label}</text>
						{/if}
					</g>
				{/each}
				{#each nodes as node (node.id)}
					{@const isStep = stepById.has(node.id)}
					<g
						class="dg-node"
						class:is-selected={selected === node.id}
						class:is-dim={dimNode(node.id)}
						data-node={node.id}
						role={isStep ? 'button' : undefined}
						tabindex={isStep ? 0 : undefined}
						aria-pressed={isStep ? selected === node.id : undefined}
						aria-label={isStep ? labelOf(node.id) : undefined}
						onclick={() => isStep && onselect(selected === node.id ? null : node.id)}
						onkeydown={() => {}}
					>
						{#if node.shape === 'ellipse'}
							<ellipse
								cx={node.x + node.width / 2}
								cy={node.y + node.height / 2}
								rx={node.width / 2}
								ry={node.height / 2}
								fill={fillOf(node)}
								class:is-dashed={node.dashed}
							/>
						{:else if node.shape === 'rhombus'}
							<polygon
								points="{node.x + node.width / 2},{node.y} {node.x + node.width},{node.y +
									node.height / 2} {node.x + node.width / 2},{node.y +
									node.height} {node.x},{node.y + node.height / 2}"
								fill={fillOf(node)}
								class:is-dashed={node.dashed}
							/>
						{:else}
							<rect
								x={node.x}
								y={node.y}
								width={node.width}
								height={node.height}
								rx={node.shape === 'rounded' ? 10 : 3}
								fill={fillOf(node)}
								class:is-dashed={node.dashed}
							/>
						{/if}
						<text fill={inkOf(node)} text-anchor="middle" dominant-baseline="middle">
							{#each lines(node, 12) as line, i (i)}
								<tspan x={node.x + node.width / 2} y={line.y}>{line.text}</tspan>
							{/each}
						</text>
					</g>
				{/each}
			</g>
		</svg>
	</div>
</div>

<style>
	.dg-viewer {
		position: relative;
		display: flex;
		flex-direction: column;
		height: min(70dvh, 46rem);
		min-height: 22rem;
		border: 1px solid var(--lm-line);
		border-radius: 0.75rem;
		background: color-mix(in oklch, var(--lm-paper) 85%, var(--card, white));
		overflow: hidden;
	}
	.dg-viewer.is-full {
		height: 100dvh;
		border-radius: 0;
		background: var(--lm-paper);
	}
	.dg-viewer__tools {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem;
		border-bottom: 1px solid var(--lm-line);
	}
	.dg-viewer__tools :global(.lm-btn) {
		min-height: 2.25rem;
		padding-inline: 0.625rem;
		gap: 0.375rem;
	}
	.dg-viewer__zoom {
		margin-left: auto;
		padding-right: 0.5rem;
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
		opacity: 0.7;
	}
	.dg-viewer__viewport {
		flex: 1;
		min-height: 0;
		cursor: grab;
		touch-action: none;
		outline: none;
	}
	.dg-viewer__viewport:active {
		cursor: grabbing;
	}
	.dg-viewer__viewport:focus-visible {
		box-shadow: inset 0 0 0 2px var(--ring, var(--lm-ink));
	}
	.dg-svg {
		display: block;
		user-select: none;
		font-family: var(--lm-font-body);
	}
	.dg-lane rect {
		fill: color-mix(in oklch, var(--card, white) 55%, transparent);
		stroke: var(--lm-line);
	}
	.dg-lane.is-group rect {
		fill: none;
		stroke-dasharray: 6 4;
	}
	.dg-lane text {
		fill: var(--lm-ink);
		font-size: 13px;
		font-weight: 600;
	}
	.dg-edge path {
		fill: none;
		stroke: var(--lm-ink);
		stroke-width: 1.5;
	}
	.dg-edge.is-dashed path {
		stroke-dasharray: 6 4;
	}
	.dg-edge.is-hot path {
		stroke-width: 3;
	}
	.dg-edge text {
		fill: var(--lm-ink);
		font-size: 11px;
		paint-order: stroke;
		stroke: var(--lm-paper);
		stroke-width: 4px;
	}
	.dg-node {
		cursor: pointer;
		outline: none;
	}
	.dg-node rect,
	.dg-node ellipse,
	.dg-node polygon {
		stroke: var(--lm-ink);
		stroke-width: 1.5;
	}
	.dg-node .is-dashed {
		stroke-dasharray: 6 4;
	}
	.dg-node text {
		font-size: 12px;
		pointer-events: none;
	}
	.dg-node.is-selected rect,
	.dg-node.is-selected ellipse,
	.dg-node.is-selected polygon,
	.dg-node:focus-visible rect,
	.dg-node:focus-visible ellipse,
	.dg-node:focus-visible polygon {
		stroke-width: 4;
	}
	.dg-node:focus-visible rect,
	.dg-node:focus-visible ellipse {
		stroke: var(--ring, var(--lm-ink));
	}
	.is-dim {
		opacity: 0.22;
	}
	.dg-node,
	.dg-edge {
		transition: opacity 160ms var(--lm-ease);
	}
	@media (prefers-reduced-motion: reduce) {
		.dg-node,
		.dg-edge {
			transition: none;
		}
	}
	@media (max-width: 640px) {
		.dg-hide-sm {
			display: none;
		}
	}
	@media print {
		.dg-viewer {
			height: auto;
			border: none;
		}
		.dg-viewer__tools {
			display: none;
		}
	}
</style>
