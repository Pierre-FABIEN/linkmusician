<script lang="ts">
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import { participationLabel } from '#lib/structures/rules';
	let { data, form } = $props();
</script>

<SEO title="Ma participation à l’agence" noindex nofollow />
<div class="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-24">
	<MetroPageHeader
		title="Ma participation"
		kicker={data.agency.name}
		intro={participationLabel('AGENCY', data.agency.status, data.agency.role)}
	/>
	{#if form?.error}<p role="alert">{form.error}</p>{/if}
	<p>
		{data.agency.role === 'MEMBER'
			? 'Ce rôle de collaborateur ne donne pas accès à la gestion ni à la liste de l’équipe.'
			: 'Ce rôle donne accès à la gestion de l’agence et à son équipe.'} Aucun droit sur les artistes
		ni pouvoir de signature n’est accordé par cette participation.
	</p>
	{#if data.agency.status === 'INVITED'}
		<form method="POST" action="?/answer" use:enhance class="flex flex-wrap gap-3">
			<button name="accept" value="1" class="lm-btn">Accepter l’invitation</button><button
				name="accept"
				value="0"
				class="lm-btn"
				data-variant="ghost">Décliner</button
			>
		</form>
	{:else}
		<form method="POST" action="?/leave" use:enhance>
			<button class="lm-btn" data-variant="ghost">Quitter l’agence</button>
		</form>
		{#if data.agency.role === 'OWNER'}
			<form method="POST" action="?/close" use:enhance class="lm-tile lm-tile--flow space-y-3 p-4">
				<p>
					Fermer l’agence retire toutes les participations et invitations. L’historique est
					conservé. Les accompagnements individuels restent indépendants.
				</p>
				<label class="flex items-center gap-3"
					><input type="checkbox" name="confirm" value="1" required />Je confirme la fermeture de
					l’agence</label
				><button class="lm-btn" data-variant="ghost">Fermer l’agence</button>
			</form>
		{/if}
	{/if}
</div>
