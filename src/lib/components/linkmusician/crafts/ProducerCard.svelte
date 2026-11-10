<script lang="ts">
	// LINKMUSICIAN: carte « Producteur·rice » du profil public (P4-04). Tout
	// est déclaratif ; les tarifs restent « indicatifs ».
	import * as Card from '#shadcn/card';
	import { Badge } from '#shadcn/badge';
	import { ExternalLink } from 'lucide-svelte';
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
	import {
		CRAFT_MOBILITY_LABELS,
		type CraftMobilityValue,
		type Reference
	} from '#lib/crafts/common';
	import { PRODUCER_SPECIALTY_INFO, type ProducerSpecialtyValue } from '#lib/crafts/producer';

	let {
		profile
	}: {
		profile: {
			specialties: ProducerSpecialtyValue[];
			genres: { id: string; name: string }[];
			mobility: CraftMobilityValue[];
			software: string;
			rate: string;
			references: Reference[];
			tier: { id: string; label: string } | null;
		};
	} = $props();

	const software = $derived(profile.software ? profile.software.split('\n') : []);
</script>

<Card.Root>
	<Card.Header><Card.Title><h2>Producteur·rice</h2></Card.Title></Card.Header>
	<Card.Content class="space-y-4">
		{#if profile.tier}<TierBadge {...profile.tier} prefix="Rang de producteur·rice :" />{/if}
		{#if profile.specialties.length > 0}
			<div class="flex flex-wrap gap-1">
				{#each profile.specialties as s (s)}<Badge variant="secondary"
						>{PRODUCER_SPECIALTY_INFO[s].label}</Badge
					>{/each}
			</div>
		{/if}
		{#if profile.genres.length > 0}
			<p class="text-sm">
				<span class="font-semibold">Styles produits :</span>
				{profile.genres.map((g) => g.name).join(', ')}
			</p>
		{/if}
		{#if profile.rate}
			<p class="text-sm">
				<span class="font-semibold">Tarifs indicatifs :</span>
				{profile.rate}
			</p>
		{/if}
		{#if profile.mobility.length > 0}
			<ul class="space-y-1 text-sm text-muted-foreground">
				{#each profile.mobility as m (m)}<li>{CRAFT_MOBILITY_LABELS[m]}</li>{/each}
			</ul>
		{/if}
		{#if profile.references.length > 0}
			<div class="space-y-2">
				<h3 class="text-sm font-semibold">Productions en écoute</h3>
				<ul class="space-y-1">
					{#each profile.references as r (r.url)}
						<li>
							<a
								href={r.url}
								target="_blank"
								rel="noopener noreferrer nofollow ugc"
								class="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline"
							>
								{r.title}
								<ExternalLink class="size-3" aria-hidden="true" />
							</a>
						</li>
					{/each}
				</ul>
				<p class="text-xs text-muted-foreground">Ajoutées par la personne, non vérifiées.</p>
			</div>
		{/if}
		{#if software.length > 0}
			<details>
				<summary class="min-h-11 cursor-pointer content-center text-sm font-medium"
					>Logiciels</summary
				>
				<ul class="mt-1 list-inside list-disc text-sm text-muted-foreground">
					{#each software as line, i (i)}<li>{line}</li>{/each}
				</ul>
			</details>
		{/if}
	</Card.Content>
</Card.Root>
