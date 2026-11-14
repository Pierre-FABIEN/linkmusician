<script lang="ts">
	import { resolve } from '$app/paths';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import ActivityTimeline from '#lib/components/linkmusician/activity/ActivityTimeline.svelte';
	let { data } = $props();
</script>

<SEO title="Historique de mes participations" noindex nofollow />
<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<MetroPageHeader title="Historique de mes participations" />
		<a href={resolve('/(app)/structure')} class="lm-link">Retour à Mes structures</a>
		<p>
			Les 100 périodes les plus récemment mises à jour de tes agences, studios, lieux et
			organisations. Chaque liste concerne uniquement ta propre participation, y compris après un
			départ. Cet historique ne donne aucun accès aux outils de gestion.
		</p>
		<p>
			Seuls les nouveaux actes de participation sont enregistrés. Les anciennes invitations connues
			restent visibles ; aucun autre acte passé n’est reconstitué.
		</p>
		{#each data.periods as period (period.id)}
			<div class="space-y-3">
				<p class="text-sm text-muted-foreground">{period.typeLabel}</p>
				<ActivityTimeline
					title={period.name}
					id={`period-${period.id}`}
					entries={period.activity}
				/>
			</div>
		{:else}
			<p>Aucun historique de participation conservé pour l’instant.</p>
		{/each}
	</div>
</div>
