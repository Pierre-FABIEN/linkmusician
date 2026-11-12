<script lang="ts">
	/**
	 * LINKMUSICIAN: fond Metro commun à l'en-tête, à la page et au pied de page
	 * (D56). Posé par la mise en page racine autour de la page et du pied de
	 * page : le papier (et l'Aurora sur un accueil) court d'un bord à l'autre,
	 * sans rupture sous l'en-tête ni au-dessus du pied de page.
	 */
	import '#lib/linkmusician/theme.css';
	import type { Snippet } from 'svelte';
	import type { Backdrop } from '#lib/linkmusician/backdrop';
	import Aurora from './Aurora.svelte';

	let { aurora, children }: { aurora: Backdrop['aurora']; children: Snippet } = $props();

	const tones = {
		jam: ['var(--tone-orange)', 'var(--tone-rose)', 'var(--tone-cyan)', 'var(--tone-amber)'],
		career: ['var(--tone-violet)', 'var(--tone-amber)', 'var(--tone-blue)', 'var(--tone-rose)'],
		mix: ['var(--tone-violet)', 'var(--tone-orange)', 'var(--tone-rose)', 'var(--tone-amber)']
	} as const;
</script>

<div class="lm-metro lm-backdrop">
	{#if aurora}
		<Aurora intensity="subtle" speed={1} tones={tones[aurora]} fade class="lm-backdrop__inner">
			{@render children()}
		</Aurora>
	{:else}
		<div class="lm-backdrop__inner">{@render children()}</div>
	{/if}
</div>
