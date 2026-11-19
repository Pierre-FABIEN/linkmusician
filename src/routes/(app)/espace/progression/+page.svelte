<script lang="ts">
	// LINKMUSICIAN: points, succès et confiance, voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import AchievementBadge from '#lib/components/linkmusician/progress/AchievementBadge.svelte';
	import { ShieldCheck } from 'lucide-svelte';

	let { data } = $props();
</script>

<SEO title="Points, succès et confiance" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-8">
		<MetroPageHeader
			kicker="Collab"
			title="Points, succès et confiance"
			intro="Niveau {data.level} · {data.xp} XP. La confiance grandit avec les échanges réels, jamais avec les points."
		/>
		<section class="lm-tile lm-tile--flow space-y-3 p-4" aria-labelledby="trust-title">
			<h2 id="trust-title" class="flex items-center gap-2 text-xl font-bold">
				<ShieldCheck class="size-5 lm-tone-icon" data-tone="lime" aria-hidden="true" /> Confiance : {data
					.trust.name}
			</h2>
			<p class="text-sm text-muted-foreground">
				Jusqu’à {data.trust.dailyFirstMessages} premiers messages par jour.
			</p>
			{#if data.trust.nextName}
				<p class="text-sm font-medium">Pour passer {data.trust.nextName}</p>
				<ul class="space-y-1 text-sm text-muted-foreground">
					{#each data.trust.requirements as r (r.label)}
						<li>
							<span aria-hidden="true">{r.met ? '✅' : '⬜'}</span>
							{r.label}<span class="sr-only">{r.met ? ' : fait' : ' : à faire'}</span>
						</li>
					{/each}
				</ul>
			{/if}
			<a href="/reglages" class="block text-sm underline">Détail et limites</a>
		</section>
		<section class="space-y-3" aria-labelledby="achievements-title">
			<h2 id="achievements-title" class="text-xl font-bold">Succès</h2>
			{#each data.achievements as a (a.id)}<AchievementBadge {...a} />{/each}
		</section>
	</div>
</div>
