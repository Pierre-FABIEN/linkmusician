<script lang="ts">
	// LINKMUSICIAN: fiche privée de carrière (P3-14), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import CareerSheetCard from '#lib/components/linkmusician/CareerSheetCard.svelte';

	let { data } = $props();
</script>

<SEO title="Ma fiche de carrière" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<MetroPageHeader
			kicker="Collab"
			title="Ma fiche de carrière"
			intro="Tes rencontres et tes étapes musicales. Les données privées restent visibles par toi seul·e."
		/>
		<CareerSheetCard sheet={data.sheet} handle={data.handle} shareable={data.canShare} />

		<section class="space-y-3" aria-labelledby="private-career-title">
			<div>
				<h2 id="private-career-title" class="text-xl font-bold">Rien que pour toi</h2>
				<p class="text-sm text-muted-foreground">
					Ces données ne figurent pas sur ton profil public.
				</p>
			</div>
			<dl class="grid grid-cols-2 gap-2 sm:grid-cols-4">
				<div class="lm-tile lm-tile--flow p-3">
					<dt class="text-xs text-muted-foreground">Jams où tu as dit « J’y étais »</dt>
					<dd class="mt-1 font-semibold">{data.sheet.jamsAttended}</dd>
				</div>
				<div class="lm-tile lm-tile--flow p-3">
					<dt class="text-xs text-muted-foreground">Morceaux composés seul·e</dt>
					<dd class="mt-1 font-semibold">{data.sheet.worksSolo}</dd>
				</div>
				<div class="lm-tile lm-tile--flow p-3">
					<dt class="text-xs text-muted-foreground">XP</dt>
					<dd class="mt-1 font-semibold">{data.sheet.xp}</dd>
				</div>
				<div class="lm-tile lm-tile--flow p-3">
					<dt class="text-xs text-muted-foreground">Niveau</dt>
					<dd class="mt-1 font-semibold">{data.sheet.level}</dd>
				</div>
			</dl>
		</section>

		{#if data.canShare}
			<a href="/@{data.handle}" class="inline-flex min-h-11 items-center font-semibold underline">
				Voir ton profil public
			</a>
		{:else}
			<p class="text-sm text-muted-foreground">
				Rends ton profil visible pour pouvoir partager tes cartes souvenirs.
			</p>
		{/if}
	</div>
</div>
