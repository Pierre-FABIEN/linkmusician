<script lang="ts">
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import MenuList from '#lib/components/linkmusician/MenuList.svelte';
	import { Users, Plus } from 'lucide-svelte';
	let { data } = $props();
</script>

<SEO title="Affectations et délégations" noindex nofollow />
<div class="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-24">
	<MetroPageHeader
		title="Affectations et délégations"
		intro="Tes propositions, accords et droits nominatifs sur un accompagnement."
	/>
	{#if data.delegations.length}<MenuList
			label="Mes affectations"
			items={data.delegations.map((d) => ({
				href: `/delegations/${d.id}`,
				title: d.artistName,
				text: `${d.agencyName} · ${d.delegateName} · ${d.endedAt ? 'Retirée' : d.acceptedAt && d.approvedAt ? 'Accords donnés' : 'Accords en attente'}`,
				icon: Users
			}))}
		/>{:else}<p>Aucune affectation pour l’instant.</p>{/if}
	{#if data.canPropose}<MenuList
			label="Proposer une affectation"
			items={[
				{
					href: '/delegations/nouvelle',
					title: 'Confier un accompagnement',
					text: 'Soumettre les droits au collaborateur et à l’artiste.',
					icon: Plus
				}
			]}
		/>{/if}
</div>
