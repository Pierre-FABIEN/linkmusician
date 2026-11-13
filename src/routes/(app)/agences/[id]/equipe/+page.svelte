<script lang="ts">
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import { participationLabel } from '#lib/structures/rules';
	import { mayRemoveAgencyMember } from '#lib/agencies/rules';
	let { data, form } = $props();
</script>

<SEO title="Équipe de l’agence" noindex nofollow />
<div class="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-24">
	<MetroPageHeader
		title="Équipe"
		kicker={data.agency.name}
		intro="La co-gestion administre l’agence ; les collaborateurs n’accèdent pas à sa gestion."
	/>
	{#if form && 'error' in form && form.error}<p role="alert">{form.error}</p>{/if}
	{#if form && 'done' in form && form.done}<p role="status">{form.done}</p>{/if}
	<form method="POST" action="?/invite" use:enhance class="space-y-3">
		<label class="block"
			>Nom d’utilisateur<input
				name="handle"
				required
				autocomplete="off"
				class="lm-field block w-full"
			/></label
		>
		<label class="block"
			>Rôle proposé<select name="role" class="lm-field block w-full"
				><option value="MEMBER">Collaborateur·rice</option>{#if data.agency.role === 'OWNER'}<option
						value="ADMIN">Co-gestion</option
					>{/if}</select
			></label
		>
		<p class="text-sm text-muted-foreground">
			Les personnes invitées doivent être majeures. La co-gestion demande le métier Manager ou
			Booker. Aucun rôle ne donne de pouvoir de signature ou de mandat artistique.
		</p>
		<button class="lm-btn">Inviter</button>
	</form>
	<ul class="space-y-3" aria-label="Membres et invitations">
		{#each data.team as member (member.id)}
			<li class="lm-tile lm-tile--flow space-y-2 p-4">
				<p class="font-semibold">{member.person.displayName}</p>
				<p>{participationLabel('AGENCY', member.status, member.role)}</p>
				{#if member.id !== data.agency.membershipId && mayRemoveAgencyMember(data.agency.role, member.role, member.status, false)}
					<form method="POST" action="?/remove" use:enhance>
						<input type="hidden" name="membershipId" value={member.id} /><button
							class="lm-btn"
							data-variant="ghost"
							>{member.status === 'INVITED' ? 'Annuler l’invitation' : 'Retirer'}</button
						>
					</form>
				{/if}
			</li>
		{/each}
	</ul>
</div>
