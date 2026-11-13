<script lang="ts">
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import MenuList from '#lib/components/linkmusician/MenuList.svelte';
	import { Building2, Plus } from 'lucide-svelte';
	let { data } = $props();
</script>

<SEO title="Mes agences" noindex nofollow />
<div class="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-24">
	<MetroPageHeader title="Mes agences" intro="Tes équipes de management et de booking." />
	{#if data.agencies.length}
		<MenuList
			label="Mes participations"
			items={data.agencies.map((s) => ({
				href: `/agences/${s.id}`,
				title: s.name,
				text: s.roleLabel,
				icon: Building2
			}))}
		/>
	{:else}<p>Aucune agence pour l’instant.</p>{/if}
	{#if data.canCreate}<MenuList
			label="Ouvrir une agence"
			items={[
				{
					href: '/agences/nouvelle',
					title: 'Créer une agence',
					text: 'Rassembler ton équipe de management ou de booking.',
					icon: Plus
				}
			]}
		/>{/if}
</div>
