<script lang="ts">
	/**
	 * LINKMUSICIAN: complétude d'un métier (ONB-12b, D61) : ce qui manque pour
	 * être trouvé·e, avec le bénéfice de chaque ajout. Ni pourcentage ni XP.
	 */
	import type { CompletenessItem, TrackCompleteness } from '#lib/actors/completeness';

	let {
		completeness,
		common = []
	}: { completeness: TrackCompleteness; common?: CompletenessItem[] } = $props();

	const missing = $derived([...common, ...completeness.missing]);
</script>

<section
	class="space-y-3 rounded-lg border p-4"
	aria-labelledby="completude-titre"
	data-testid="completude"
>
	<h2 id="completude-titre" class="text-lg font-semibold">Ton profil de {completeness.label}</h2>
	{#if completeness.soon}
		<p class="text-sm text-muted-foreground">
			Ce métier arrive bientôt : rien n’est exigé pour l’instant.
		</p>
	{:else if missing.length === 0}
		<p class="text-sm" data-testid="completude-ok">
			Ton profil est exploitable : on peut te trouver pour ce que tu proposes.
		</p>
	{:else}
		<p class="text-sm">Pour qu’on te trouve, il manque :</p>
		<ul class="space-y-2">
			{#each missing as item (item.id)}
				<li data-testid="completude-manque">
					<a href={item.href} class="font-medium underline">{item.label}</a>
					<span class="block text-sm text-muted-foreground">{item.benefit}</span>
				</li>
			{/each}
		</ul>
	{/if}
	{#if completeness.optional.length > 0}
		<details>
			<summary class="cursor-pointer text-sm">Pour aller plus loin (facultatif)</summary>
			<ul class="mt-2 space-y-2">
				{#each completeness.optional as item (item.id)}
					<li>
						<a href={item.href} class="underline">{item.label}</a>
						{#if item.benefit}<span class="block text-sm text-muted-foreground">{item.benefit}</span
							>{/if}
					</li>
				{/each}
			</ul>
		</details>
	{/if}
</section>
