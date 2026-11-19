<script lang="ts">
	/**
	 * LINKMUSICIAN: une invitation à un projet (U3, conception 20 §8.2, §9.3),
	 * partagée par « Mes projets » et « À traiter ». Avant de répondre : le
	 * nom et le type du projet, son porteur, qui invite, le rôle et ce qui est
	 * proposé, en clair ; rien des morceaux, de l'équipe ni de la description.
	 * Deux gestes : « Rejoindre », « Refuser » (aucun motif demandé). La page
	 * hôte porte l'action `?/repondre` ; le serveur relit tout sous verrou.
	 */
	import { enhance } from '$app/forms';
	import { PROJECT_KIND_LABELS, type ProjectKindValue } from '#lib/projects/rules';
	import {
		CAPABILITY_LABELS,
		JOIN_NOTICE,
		PRESETS,
		type ProjectCapabilityValue
	} from '#lib/projects/participants';

	let {
		invitation
	}: {
		invitation: {
			id: string;
			projectName: string;
			kind: ProjectKindValue;
			owner: string;
			invitedBy: string | null;
			role: string | null;
			capabilities: readonly ProjectCapabilityValue[];
		};
	} = $props();

	const coordinate = $derived(invitation.capabilities.includes('COORDINATE'));
	let sending = $state<'accept' | 'decline' | null>(null);
</script>

<li data-tone="paper" class="lm-tile lm-tile--flow space-y-3 p-4" data-testid="project-invitation">
	<p class="lm-tile__kicker">Projet · {PROJECT_KIND_LABELS[invitation.kind]}</p>
	<p class="text-lg font-semibold wrap-break-word">
		{invitation.invitedBy
			? `${invitation.invitedBy} t’invite ${coordinate ? 'à coordonner' : 'dans'} « ${invitation.projectName} »`
			: `Invitation dans « ${invitation.projectName} »`}
	</p>
	<p class="text-sm">Porté par {invitation.owner}</p>
	{#if invitation.role}<p class="text-sm">Ton rôle : {invitation.role}</p>{/if}
	<div class="space-y-1 text-sm">
		<p class="font-medium">
			{coordinate
				? `Proposé : ${invitation.capabilities.map((c) => CAPABILITY_LABELS[c]).join(', ')}`
				: PRESETS.participant.label}
		</p>
		<p class="text-muted-foreground">
			{coordinate ? PRESETS.coordinator.phrase : PRESETS.participant.phrase}
		</p>
	</div>
	<p class="text-sm text-muted-foreground">{JOIN_NOTICE}</p>
	<form
		method="POST"
		action="?/repondre"
		class="flex flex-wrap gap-3"
		use:enhance={({ submitter }) => {
			sending = (submitter as HTMLButtonElement | null)?.value === 'decline' ? 'decline' : 'accept';
			return async ({ update }) => {
				await update();
				sending = null;
			};
		}}
	>
		<input type="hidden" name="participantId" value={invitation.id} />
		<button
			class="lm-btn"
			name="answer"
			value="accept"
			disabled={sending !== null}
			aria-busy={sending === 'accept'}
			>{sending === 'accept' ? 'Envoi…' : 'Rejoindre'}<span class="sr-only">
				: {invitation.projectName}</span
			></button
		>
		<button
			class="lm-btn"
			data-variant="ghost"
			name="answer"
			value="decline"
			disabled={sending !== null}
			aria-busy={sending === 'decline'}
			>{sending === 'decline' ? 'Envoi…' : 'Refuser'}<span class="sr-only">
				: {invitation.projectName}</span
			></button
		>
	</form>
</li>
