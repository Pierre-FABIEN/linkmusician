<script lang="ts">
	// LINKMUSICIAN: campagnes en cours (P3-12), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import { Badge } from '#shadcn/badge';
	import { Music } from 'lucide-svelte';
	import { RECORDING_SUMMARY_LABELS } from '#lib/works/production';

	let { data } = $props();
</script>

<SEO title="Campagnes en cours" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<MetroPageHeader
			kicker="Mode carrière"
			title="Campagnes en cours"
			intro="Chaque morceau est une aventure : de l’idée au morceau composé, puis enregistré, joué, sorti. Une place libre ? Recrute la bonne personne depuis la fiche du morceau."
		/>
		{#if data.toConfirm.length > 0}
			<p class="rounded-2xl border-2 border-primary/40 bg-card p-4 text-sm">
				On te crédite sur {data.toConfirm.length} morceau{data.toConfirm.length > 1 ? 'x' : ''} :
				<a href="/morceaux" class="font-semibold underline">confirmer mon rôle</a>
			</p>
		{/if}
		{#if data.works.length === 0}
			<div class="lm-tile lm-tile--flow space-y-2 p-6 text-center">
				<Music class="mx-auto size-6 text-primary" aria-hidden="true" />
				<p class="font-semibold">Pas encore de morceau.</p>
				<p class="text-sm text-muted-foreground">
					Note une idée, crédite les personnes qui y jouent, ajoute une maquette.
				</p>
				<a href="/morceaux/nouveau" class="inline-block pt-1 font-semibold underline"
					>Nouvelle idée</a
				>
			</div>
		{:else}
			<ul class="space-y-3" aria-label="Mes campagnes">
				{#each data.works as w (w.id)}
					<li>
						<a
							href="/morceaux/{w.id}"
							class="lm-tile lm-tile--flow flex min-h-16 flex-wrap items-center justify-between gap-2 p-4"
						>
							<span>
								<span class="block font-semibold">{w.title}</span>
								<span class="text-sm text-muted-foreground"
									>{w.band ? `${w.band.name} · ` : ''}{w.credits} crédit{w.credits > 1 ? 's' : ''} confirmé{w.credits >
									1
										? 's'
										: ''}</span
								>
							</span>
							<span class="flex flex-wrap gap-2">
								<Badge variant={w.state === 'IDEA' ? 'outline' : 'secondary'}
									>{w.state === 'IDEA' ? 'Idée' : 'Composé'}</Badge
								>
								{#if w.recording}
									<!-- LINKMUSICIAN: DASH-06d, enregistrement fait ou déclaré. -->
									<Badge variant="outline">{RECORDING_SUMMARY_LABELS[w.recording]}</Badge>
								{/if}
								{#if w.openRoles > 0}
									<Badge
										>{w.openRoles} place{w.openRoles > 1 ? 's' : ''} libre{w.openRoles > 1
											? 's'
											: ''}</Badge
									>
								{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
			<a href="/morceaux/nouveau" class="inline-block font-semibold underline">Nouvelle idée</a>
		{/if}
	</div>
</div>
