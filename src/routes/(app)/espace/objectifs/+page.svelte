<script lang="ts">
	// LINKMUSICIAN: mes objectifs (P3-12), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import SubPageHeader from '#lib/components/linkmusician/SubPageHeader.svelte';
	import QuestCard from '#lib/components/linkmusician/progress/QuestCard.svelte';
	import { AMBITION_INFO } from '#lib/career/ambition';

	let { data } = $props();
</script>

<SEO title="Mes objectifs" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<SubPageHeader
			title="Tes prochains objectifs"
			intro="Les trois étapes atteignables maintenant : des faits réels de ta carrière, à franchir avec d’autres."
		/>
		<p class="text-sm">
			{#if data.ambition}
				Mis en avant pour ton ambition : <strong>{AMBITION_INFO[data.ambition].label}</strong>.
				<a href="/espace/ambition" class="underline">Changer</a>
			{:else}
				<a href="/espace/ambition" class="underline">Choisis ton ambition</a> : on mettra en avant les
				objectifs qui t’en rapprochent.
			{/if}
		</p>
		<p class="text-sm text-muted-foreground">
			{data.questProgress.done} objectif{data.questProgress.done > 1 ? 's' : ''} atteint{data
				.questProgress.done > 1
				? 's'
				: ''} sur {data.questProgress.total}.
		</p>
		<div class="space-y-3">
			{#each data.objectives as q (q.id)}<QuestCard {...q} />{:else}
				<p class="text-sm text-muted-foreground">Tu as tout débloqué pour l’instant. Bravo !</p>
			{/each}
		</div>
	</div>
</div>
