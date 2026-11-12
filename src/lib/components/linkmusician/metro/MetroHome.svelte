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
	 * §4.5 et §5) : un en-tête, puis un panorama de pivots dont
	 * chacun est un menu de tuiles. Le héros « prochaine étape » ouvre le
	 * premier pivot. Toute la navigation porte un seul nom (`label`), pour
	 * qu'on la retrouve comme l'ancien menu. L'Aurora vient du fond commun
	 * (`MetroBackdrop`, D56), qui enveloppe aussi l'en-tête et le pied de page.
	 */
	import type { Snippet } from 'svelte';
	import Panorama from './Panorama.svelte';
	import Pivot from './Pivot.svelte';
	import MetroMenu from './MetroMenu.svelte';

	let {
		label,
		pivots,
		header,
		hero
	}: {
		label: string;
		pivots: MetroPivot[];
		header: Snippet;
		hero?: Snippet;
	} = $props();
</script>

<div class="w-full space-y-6 pt-6 pb-24 lg:pt-10">
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
