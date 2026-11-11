<script lang="ts">
	import Tile from './Tile.svelte';
	import { ArrowRight } from 'lucide-svelte';

	import type { Size as TileSize, Tone } from './tones';

	type Size = Extract<TileSize, 'wide' | 'band' | 'big'>;

	let {
		tone = 'rose',
		size = 'band',
		eyebrow,
		title,
		detail,
		actionLabel,
		href
	}: {
		tone?: Tone;
		size?: Size;
		eyebrow: string;
		title: string;
		detail: string;
		actionLabel: string;
		href: string;
	} = $props();
</script>

<Tile {tone} {size} {href} class="lm-pattern-tile lm-pattern-tile--cta lm-action-tile">
	<div class="space-y-2">
		<p class="lm-tile__kicker">{eyebrow}</p>
		<h2 class="lm-action-tile__title">{title}</h2>
		<p class="lm-tile__text">{detail}</p>
	</div>
	<span class="lm-btn">{actionLabel}<ArrowRight class="size-4" aria-hidden="true" /></span>
</Tile>
