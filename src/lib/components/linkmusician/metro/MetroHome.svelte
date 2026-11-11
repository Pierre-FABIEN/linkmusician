<script lang="ts" module>
	import type { MetroMenuItem } from './MetroMenu.svelte';

	export type MetroPivot = {
		id: string;
		/** Un mot, en minuscules (Q41) : « jouer », « mes jams ». */
		title: string;
		items: MetroMenuItem[];
	};
</script>

<script lang="ts">
	/**
	 * LINKMUSICIAN: accueil de mode Metro (MET-02, D50, D55 ; `docs/design`
	 * §4.5 et §5) : fond Aurora, un en-tête, puis un panorama de pivots dont
	 * chacun est un menu de tuiles. Le héros « prochaine étape » ouvre le
	 * premier pivot. Toute la navigation porte un seul nom (`label`), pour
	 * qu'on la retrouve comme l'ancien menu.
	 */
	import type { Snippet } from 'svelte';
	import Aurora from './Aurora.svelte';
	import Panorama from './Panorama.svelte';
	import Pivot from './Pivot.svelte';
	import MetroMenu from './MetroMenu.svelte';

	let {
		label,
		tones,
		pivots,
		header,
		hero
	}: {
		label: string;
		/** Couleurs des voiles de l'Aurora : les tons du mode (`var(--tone-*)`). */
		tones: readonly string[];
		pivots: MetroPivot[];
		header: Snippet;
		hero?: Snippet;
	} = $props();
</script>

<Aurora intensity="subtle" speed={1} {tones} fade class="min-h-screen w-full">
	<div class="space-y-6 pt-6 pb-24 lg:pt-10">
		<div class="lm-home__head mx-auto w-full">{@render header()}</div>
		<nav aria-label={label}>
			<!-- Le rail ne reprend pas `label` : un second landmark « Sections de Mode jam »
			     rendrait le nom ambigu. -->
			<Panorama label="cet accueil">
				{#each pivots as pivot, i (pivot.id)}
					<Pivot id={pivot.id} title={pivot.title}>
						<MetroMenu items={pivot.items} hero={i === 0 ? hero : undefined} />
					</Pivot>
				{/each}
			</Panorama>
		</nav>
	</div>
</Aurora>
