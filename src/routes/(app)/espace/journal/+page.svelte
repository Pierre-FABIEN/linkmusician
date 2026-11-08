<script lang="ts">
	// LINKMUSICIAN: journal de bord (P3-12), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import SubPageHeader from '#lib/components/linkmusician/SubPageHeader.svelte';

	let { data } = $props();
	const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
</script>

<SEO title="Journal de bord" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<SubPageHeader
			title="Journal de bord"
			intro="D’où viennent tes points : chaque gain et sa raison. Toi seul·e le vois."
		/>
		{#if data.history.length === 0}
			<p class="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
				Aucun point pour l’instant : ton premier objectif t’en rapportera.
			</p>
		{:else}
			<ul aria-label="Historique des gains" class="divide-y rounded-2xl border bg-card">
				{#each data.history as g (g.id)}
					<li class="flex items-center justify-between gap-3 px-4 py-3 text-sm">
						<span>{g.reason}</span>
						<span class="shrink-0 text-muted-foreground">
							{g.amount >= 0 ? '+' : '−'}{Math.abs(g.amount)} XP ·
							<time datetime={new Date(g.createdAt).toISOString()}
								>{dateFormat.format(new Date(g.createdAt))}</time
							>
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
