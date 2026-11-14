<script lang="ts">
	import { resolve } from '$app/paths';
	import { History } from 'lucide-svelte';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import MenuList from '#lib/components/linkmusician/MenuList.svelte';
	import { AGENT_KIND_INFO, REPRESENTATION_STATUS_LABELS } from '#lib/representation/rules';
	let { data } = $props();
</script>

<SEO title="Historique des accompagnements" noindex nofollow />
<div class="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-24">
	<MetroPageHeader
		title="Historique des accompagnements"
		intro="Les propositions et accompagnements conservés, y compris ceux qui sont terminés."
	/>
	{#if data.history.length}
		<MenuList
			label="Mes accompagnements conservés"
			items={data.history.map((r) => ({
				href: resolve('/(app)/accompagnement/[id]/historique', { id: r.id }),
				title: `${r.artistName} · ${r.agentName}`,
				text: `${AGENT_KIND_INFO[r.kind].label} · ${REPRESENTATION_STATUS_LABELS[r.status]}`,
				icon: History
			}))}
		/>
		<p class="text-sm text-muted-foreground">
			Les 100 accompagnements les plus récents au maximum.
		</p>
	{:else}
		<p>Aucun accompagnement conservé pour l’instant.</p>
	{/if}
	<p class="text-sm text-muted-foreground">
		Une proposition déclinée ou retirée n’est pas conservée dans cet historique.
	</p>
</div>
