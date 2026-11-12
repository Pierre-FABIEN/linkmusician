<script lang="ts">
	// LINKMUSICIAN: « Apprécier les musicos croisés » (D50), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import { Badge } from '#shadcn/badge';
	import { Heart, MapPin } from 'lucide-svelte';

	let { data } = $props();
	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'short',
		timeZone: 'Europe/Paris'
	});
</script>

<SEO title="Apprécier les musicos croisés" noindex nofollow />

<div class="min-h-screen w-full px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<MetroPageHeader
			kicker="Mode jam"
			title="Apprécier les musicos croisés"
			intro="Tu joues en ce moment, ou tu as joué cette semaine ? Dis ce que tu as aimé chez les autres : bon groove, à l’écoute, belle impro… C’est ce qui fait monter leurs points."
		/>

		{#if data.jams.length === 0}
			<div class="lm-tile lm-tile--flow space-y-2 p-6 text-center">
				<Heart class="mx-auto size-6 text-primary" aria-hidden="true" />
				<p class="font-semibold">Pas de jam cette semaine.</p>
				<p class="text-sm text-muted-foreground">
					Pendant une jam et les 7 jours qui suivent, tu pourras apprécier ici les musicien·nes avec
					qui tu as joué.
				</p>
				<a href="/jam/agenda" class="inline-block pt-1 font-semibold underline"
					>Voir les jams à venir</a
				>
			</div>
		{:else}
			<ul class="space-y-3" aria-label="Jams où tu as croisé des musicien·nes">
				{#each data.jams as j (j.id)}
					<li>
						<a
							href="/jams/{j.id}/presents"
							class="lm-tile lm-tile--flow block space-y-2 p-4 {j.live || j.left > 0
								? 'border-primary/60'
								: ''}"
						>
							<span class="flex flex-wrap items-start justify-between gap-2">
								<span class="text-lg font-bold">{j.title}</span>
								{#if j.live}
									<Badge>En cours</Badge>
								{:else}
									<Badge variant="outline">{day.format(new Date(j.startsAt))}</Badge>
								{/if}
							</span>
							<span class="flex items-center gap-1.5 text-sm text-muted-foreground">
								<MapPin class="size-4" aria-hidden="true" />{j.venue}
							</span>
							<span class="flex flex-wrap items-center justify-between gap-2 text-sm">
								<span>{j.label}</span>
								<span class="font-semibold text-primary"
									>{j.attended ? 'Qui était là ?' : 'J’y étais'}</span
								>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
