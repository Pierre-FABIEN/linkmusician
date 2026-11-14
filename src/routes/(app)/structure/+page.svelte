<script lang="ts">
	/** DASH-02a : mes participations, communes à tous les contextes métier. */
	import SEO from '#lib/components/SEO.svelte';
	import { Building2 } from 'lucide-svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import MetroEmpty from '#lib/components/linkmusician/metro/MetroEmpty.svelte';
	import MenuList from '#lib/components/linkmusician/MenuList.svelte';
	let { data } = $props();
	const items = $derived(
		data.structures.map((s) => ({
			href: `/structure/${s.id}`,
			title: s.name,
			text: `${s.typeLabel} · ${s.roleLabel}`,
			icon: Building2
		}))
	);
</script>

<SEO title="Mes structures" noindex nofollow />
<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<MetroPageHeader
			title="Mes structures"
			intro="Tes groupes, studios, lieux, organisations, agences et écoles. Ces participations sont communes à tes métiers."
		/>
		<p class="text-sm text-muted-foreground">
			Rejoindre une structure ne donne pas accès à sa gestion. Une invitation doit être acceptée
			avant de commencer.
		</p>
		{#if items.length}
			<MenuList {items} label="Mes participations" />
		{:else}
			<MetroEmpty
				icon={Building2}
				title="Aucune structure pour l’instant"
				text="Tu n’as pas encore de participation ou d’invitation en attente."
				action={{ href: '/groupes', label: 'Voir mes groupes et invitations' }}
			/>
		{/if}
		<MenuList
			label="Mes historiques"
			items={[
				{
					href: '/structure/historique',
					title: 'Historique de mes participations',
					text: 'Tes invitations et actes de co-gestion des studios, lieux et organisations, y compris après un départ.',
					icon: Building2
				}
			]}
		/>
		<MenuList
			label="Ouvrir une structure"
			items={data.open.map((item) => ({ ...item, icon: Building2 }))}
		/>
	</div>
</div>
