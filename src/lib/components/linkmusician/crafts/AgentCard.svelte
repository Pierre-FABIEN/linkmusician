<script lang="ts">
	// LINKMUSICIAN: carte « Manager / Booker » du profil public (P5-07). La
	// fiche est déclarative ; les artistes affichés sont ceux qui ont confirmé
	// l'accompagnement, et le rang en vient, jamais de l'XP.
	import * as Card from '#shadcn/card';
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
	import { AGENT_KIND_INFO, type AgentKindValue } from '#lib/representation/rules';

	let {
		profile
	}: {
		profile: {
			kinds: AgentKindValue[];
			pitch: string | null;
			genres: { id: string; name: string }[];
			tier: { id: string; label: string } | null;
			artists: { kind: AgentKindValue; handle: string; name: string; isBand: boolean }[];
		};
	} = $props();
	const title = $derived(profile.kinds.map((k) => AGENT_KIND_INFO[k].label).join(' et '));
</script>

<Card.Root>
	<Card.Header><Card.Title><h2>{title}</h2></Card.Title></Card.Header>
	<Card.Content class="space-y-4">
		{#if profile.tier}<TierBadge {...profile.tier} prefix="Rang :" />{/if}
		{#if profile.pitch}<p class="text-sm whitespace-pre-line">{profile.pitch}</p>{/if}
		{#if profile.genres.length > 0}
			<p class="text-sm">
				<span class="font-semibold">Genres :</span>
				{profile.genres.map((g) => g.name).join(', ')}
			</p>
		{/if}
		{#if profile.artists.length > 0}
			<div class="space-y-2">
				<h3 class="text-sm font-semibold">Artistes accompagnés</h3>
				<ul class="space-y-1">
					{#each profile.artists as a (`${a.handle}-${a.kind}`)}
						<li>
							<a
								href="/@{a.handle}"
								class="inline-flex min-h-11 items-center text-sm font-medium text-primary underline"
								>{a.name}</a
							>
							<span class="text-xs text-muted-foreground">· {AGENT_KIND_INFO[a.kind].label}</span>
						</li>
					{/each}
				</ul>
				<p class="text-xs text-muted-foreground">Confirmé par chaque artiste.</p>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Pas encore d’accompagnement confirmé.</p>
		{/if}
	</Card.Content>
</Card.Root>
