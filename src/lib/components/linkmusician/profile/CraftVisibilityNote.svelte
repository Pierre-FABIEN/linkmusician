<script lang="ts">
	// LINKMUSICIAN: « Qui voit quoi » d'une page historique de métier
	// (ONB-12c2, D61, Q70) : chaque champ suit un bloc réglé sur la page du métier.
	import { craftFieldsByBlock, type CraftCardTrack } from '#lib/actors/craftCardVisibility';
	import {
		TRACK_BLOCK_INFO,
		TRACK_VISIBILITY_LABELS,
		type TrackVisibilityValue
	} from '#lib/actors/trackSheet';

	let {
		track,
		slug,
		settings
	}: {
		track: CraftCardTrack;
		slug: string;
		settings: {
			offersVisibility: TrackVisibilityValue;
			detailsVisibility: TrackVisibilityValue;
			conditionsVisibility: TrackVisibilityValue;
		};
	} = $props();

	const groups = $derived(craftFieldsByBlock(track));
</script>

<section
	class="lm-tile lm-tile--flow space-y-2 p-4 text-sm"
	aria-labelledby="qui-voit-{track}"
	data-testid="qui-voit-fiche"
>
	<h2 id="qui-voit-{track}" class="font-semibold">Qui voit quoi sur ton profil public</h2>
	<ul class="space-y-1">
		{#each groups as g (g.block)}
			<li>
				<span class="font-medium">{TRACK_BLOCK_INFO[g.block].label}</span>
				({g.fields.join(', ')}) :
				{TRACK_VISIBILITY_LABELS[settings[`${g.block}Visibility`]]}
			</li>
		{/each}
	</ul>
	<p class="text-muted-foreground">
		Tes travaux en écoute et tes crédits confirmés restent visibles de tous.
		<a href="/profil/metier/{slug}#reglages-titre" class="underline">Changer qui voit quoi</a>
	</p>
</section>
