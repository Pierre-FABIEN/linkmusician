<script lang="ts">
	// LINKMUSICIAN: carte « Ingé son » du profil public (P4-02). Les
	// crédits sont confirmés (P4-07) ; le reste est déclaratif.
	import * as Card from '#shadcn/card';
	import { Badge } from '#shadcn/badge';
	import { ExternalLink } from 'lucide-svelte';
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
	import CraftCredits from './CraftCredits.svelte';
	import {
		CRAFT_MOBILITY_LABELS,
		SOUND_SPECIALTY_INFO,
		type CraftMobilityValue,
		type Reference,
		type SoundSpecialtyValue
	} from '#lib/crafts/sound';

	let {
		profile
	}: {
		profile: {
			specialties: SoundSpecialtyValue[];
			mobility: CraftMobilityValue[];
			gear: string;
			references: Reference[];
			/** Rang d'ingé son (P4-02b), `null` avant « Home studio ». */
			tier: { id: string; label: string } | null;
			/** Crédits confirmés sur des morceaux (P4-07). */
			credits: { id: string; title: string; roles: string[] }[];
		};
	} = $props();

	const gear = $derived(profile.gear ? profile.gear.split('\n') : []);
</script>

<Card.Root>
	<Card.Header><Card.Title><h2>Ingé son</h2></Card.Title></Card.Header>
	<Card.Content class="space-y-4">
		{#if profile.tier}<TierBadge {...profile.tier} prefix="Rang d’ingé son :" />{/if}
		{#if profile.specialties.length > 0}
			<div class="flex flex-wrap gap-1">
				{#each profile.specialties as s (s)}<Badge variant="secondary"
						>{SOUND_SPECIALTY_INFO[s].label}</Badge
					>{/each}
			</div>
		{/if}
		{#if profile.mobility.length > 0}
			<ul class="space-y-1 text-sm text-muted-foreground">
				{#each profile.mobility as m (m)}<li>{CRAFT_MOBILITY_LABELS[m]}</li>{/each}
			</ul>
		{/if}
		<CraftCredits credits={profile.credits} />
		{#if profile.references.length > 0}
			<div class="space-y-2">
				<h3 class="text-sm font-semibold">Travaux en écoute</h3>
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
				<p class="text-xs text-muted-foreground">Ajoutés par la personne, non vérifiés.</p>
			</div>
		{/if}
		{#if gear.length > 0}
			<details>
				<summary class="min-h-11 cursor-pointer content-center text-sm font-medium"
					>Matériel</summary
				>
				<ul class="mt-1 list-inside list-disc text-sm text-muted-foreground">
					{#each gear as line, i (i)}<li>{line}</li>{/each}
				</ul>
			</details>
		{/if}
	</Card.Content>
</Card.Root>
