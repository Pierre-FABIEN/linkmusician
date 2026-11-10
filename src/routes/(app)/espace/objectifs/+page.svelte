<script lang="ts">
	// LINKMUSICIAN: mes objectifs (P3-12, P4-02b), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import SubPageHeader from '#lib/components/linkmusician/SubPageHeader.svelte';
	import QuestCard from '#lib/components/linkmusician/progress/QuestCard.svelte';
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
	import { AMBITION_INFO } from '#lib/career/ambition';

	let { data } = $props();
	const both = $derived(data.sound !== null && data.musician);

	const reached = (p: { done: number; total: number }) =>
		`${p.done} objectif${p.done > 1 ? 's' : ''} atteint${p.done > 1 ? 's' : ''} sur ${p.total}.`;
</script>

<SEO title="Mes objectifs" noindex nofollow />

{#snippet musician()}
	<section class="space-y-3" aria-labelledby={both ? 'objectifs-musicien' : undefined}>
		{#if both}<h2 id="objectifs-musicien" class="text-lg font-semibold">Musicien·ne</h2>{/if}
		<p class="text-sm">
			{#if data.ambition}
				Mis en avant pour ton ambition : <strong>{AMBITION_INFO[data.ambition].label}</strong>.
				<a href="/espace/ambition" class="underline">Changer</a>
			{:else}
				<a href="/espace/ambition" class="underline">Choisis ton ambition</a> : on mettra en avant les
				objectifs qui t’en rapprochent.
			{/if}
		</p>
		<p class="text-sm text-muted-foreground">{reached(data.questProgress)}</p>
		<div class="space-y-3">
			{#each data.objectives as q (q.id)}<QuestCard {...q} />{:else}
				<p class="text-sm text-muted-foreground">Tu as tout débloqué pour l’instant. Bravo !</p>
			{/each}
		</div>
	</section>
{/snippet}

{#snippet sound(s: NonNullable<typeof data.sound>)}
	<section class="space-y-3" aria-labelledby="objectifs-son">
		<h2 id="objectifs-son" class="flex flex-wrap items-center gap-2 text-lg font-semibold">
			Ingé son
			{#if s.tier}<TierBadge {...s.tier} prefix="Rang d’ingé son :" />{/if}
		</h2>
		<p class="text-sm text-muted-foreground">
			{reached(s.questProgress)} Les sessions se confirmeront bientôt avec les artistes, sur le morceau.
		</p>
		<div class="space-y-3">
			{#each s.objectives as q (q.id)}<QuestCard {...q} />{:else}
				<p class="text-sm text-muted-foreground">Tu as tout débloqué pour l’instant. Bravo !</p>
			{/each}
		</div>
	</section>
{/snippet}

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-8">
		<SubPageHeader
			title="Tes prochains objectifs"
			intro="Les étapes atteignables maintenant : des faits réels de ta carrière, à franchir avec d’autres."
		/>
		{#if data.sound && data.soundFirst}
			{@render sound(data.sound)}
			{#if data.musician}{@render musician()}{/if}
		{:else}
			{#if data.musician}{@render musician()}{/if}
			{#if data.sound}{@render sound(data.sound)}{/if}
		{/if}
	</div>
</div>
