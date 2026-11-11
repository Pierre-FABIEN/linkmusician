<script lang="ts">
	// LINKMUSICIAN: carte « Organisateur·rice » du profil public (P5-05a). La
	// fiche est déclarative ; le rang vient des événements tenus et confirmés
	// par les groupes (P5-06), jamais de l'XP.
	import * as Card from '#shadcn/card';
	import { Badge } from '#shadcn/badge';
	import { ExternalLink } from 'lucide-svelte';
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
	import type { Reference } from '#lib/crafts/common';
	import {
		PROMOTER_EVENT_KIND_INFO,
		capacityLabel,
		type PromoterEventKindValue
	} from '#lib/crafts/promoter';

	let {
		profile
	}: {
		profile: {
			eventKinds: PromoterEventKindValue[];
			genres: { id: string; name: string }[];
			capacity: number | null;
			references: Reference[];
			tier: { id: string; label: string } | null;
			/** Plateaux ouverts aux candidatures. */
			gigSlots: { id: string; title: string; startsAt: Date | null; venue: string | null }[];
			/** Organisations qu'elle ou il gère (P5-05b). */
			orgs: { handle: string; name: string }[];
		};
	} = $props();

	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: 'Europe/Paris'
	});
	const capacity = $derived(capacityLabel(profile.capacity));
</script>

<Card.Root>
	<Card.Header><Card.Title><h2>Organisateur·rice</h2></Card.Title></Card.Header>
	<Card.Content class="space-y-4">
		{#if profile.tier}<TierBadge {...profile.tier} prefix="Rang d’organisateur·rice :" />{/if}
		{#if profile.eventKinds.length > 0}
			<div class="flex flex-wrap gap-1">
				{#each profile.eventKinds as k (k)}<Badge variant="secondary"
						>{PROMOTER_EVENT_KIND_INFO[k].label}</Badge
					>{/each}
			</div>
		{/if}
		{#if profile.genres.length > 0}
			<p class="text-sm">
				<span class="font-semibold">Programme :</span>
				{profile.genres.map((g) => g.name).join(', ')}
			</p>
		{/if}
		{#if profile.orgs.length > 0}
			<p class="text-sm">
				<span class="font-semibold">Avec :</span>
				{#each profile.orgs as o, i (o.handle)}{i > 0 ? ', ' : ''}<a
						href="/@{o.handle}"
						class="font-medium underline">{o.name}</a
					>{/each}
			</p>
		{/if}
		{#if capacity}
			<p class="text-sm"><span class="font-semibold">Jauge habituelle :</span> {capacity}</p>
		{/if}
		{#if profile.gigSlots.length > 0}
			<div class="space-y-2">
				<h3 class="text-sm font-semibold">Plateaux ouverts aux groupes</h3>
				<ul class="space-y-1">
					{#each profile.gigSlots as g (g.id)}
						<li>
							<a
								href="/annonces/{g.id}"
								class="inline-flex min-h-11 items-center text-sm font-medium text-primary underline"
								>{g.title}{g.startsAt ? ` · ${day.format(new Date(g.startsAt))}` : ''}{g.venue
									? ` · ${g.venue}`
									: ''}</a
							>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if profile.references.length > 0}
			<div class="space-y-2">
				<h3 class="text-sm font-semibold">Événements passés</h3>
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
	</Card.Content>
</Card.Root>
