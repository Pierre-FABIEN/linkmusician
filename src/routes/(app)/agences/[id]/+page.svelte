<script lang="ts">
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import MenuList from '#lib/components/linkmusician/MenuList.svelte';
	import { Users, UserRound } from 'lucide-svelte';
	let { data } = $props();
	const items = $derived([
		...(data.agency.status === 'ACTIVE'
			? [
					{
						href: `/delegations?agence=${data.agency.id}`,
						title: 'Mes affectations',
						text: 'Tes seuls mandats et accords nominatifs dans cette agence.',
						icon: UserRound
					}
				]
			: []),
		{
			href: `/agences/${data.agency.id}/participation`,
			title: 'Ma participation',
			text: 'Répondre à une invitation ou quitter l’agence.',
			icon: UserRound
		},
		...(data.agency.status === 'ACTIVE' && data.agency.role !== 'MEMBER'
			? [
					{
						href: `/agences/${data.agency.id}/equipe`,
						title: 'Équipe',
						text: 'Invitations, co-gestion et collaborateurs.',
						icon: Users
					}
				]
			: [])
	]);
</script>

<SEO title={data.agency.name} noindex nofollow />
<div class="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-24">
	<MetroPageHeader
		title={data.agency.name}
		kicker="Agence"
		intro="La participation à l’agence ne donne aucun droit sur les artistes accompagnés."
	/>
	<MenuList label="Outils de l’agence" {items} />
</div>
