<script lang="ts">
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import { mandateSummary } from '#lib/representation/rules';
	import { DELEGATION_ACTION_LABELS } from '#lib/representation/delegations';
	import ActivityTimeline from '#lib/components/linkmusician/activity/ActivityTimeline.svelte';
	let { data, form } = $props();
	const d = $derived(data.delegation);
</script>

<SEO title="Affectation d’un accompagnement" noindex nofollow />
<div class="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-24">
	<MetroPageHeader
		title={d.artistName}
		kicker="Affectation"
		intro={`${d.agencyName} · ${d.agentName} → ${d.delegateName}`}
	/>
	{#if form && 'error' in form && form.error}<p role="alert" class="lm-alert p-3">
			{form.error}
		</p>{/if}
	{#if form && 'done' in form && form.done}<p role="status">{form.done}</p>{/if}
	<p class="font-semibold">
		{d.endedAt
			? 'Affectation retirée'
			: d.effective
				? 'Affectation active'
				: !d.active
					? 'Affectation inactive'
					: 'Accords en attente'}
	</p>
	<p>
		{#if d.canViewTerms}{mandateSummary(d)}{:else}Les conditions du mandat sont accessibles après
			les deux accords, tant que l’affectation reste active.{/if}
	</p>
	<ul>
		{#each d.actions as action (action)}<li>
				{DELEGATION_ACTION_LABELS[action as keyof typeof DELEGATION_ACTION_LABELS]}
			</li>{/each}
	</ul>
	<p>
		Fin exclue de l’affectation : {d.expiresAt
			? new Date(d.expiresAt).toLocaleDateString('fr-FR', { timeZone: 'UTC' })
			: 'sans échéance'}.
	</p>
	<p>
		Aucun pouvoir de signature, aucun accès aux conversations ou projets privés. Les crédits restent
		ceux de l’agent titulaire. Les droits cessent avec le mandat ou l’une des participations à
		l’agence.
	</p>
	<p>
		Collaborateur : {d.acceptedAt ? 'accord donné' : 'accord en attente'}. Artiste : {d.approvedAt
			? `accord donné par ${d.approvedBy ?? 'Compte supprimé'}`
			: 'accord en attente'}.
	</p>
	{#if d.canAccept}<form method="POST" action="?/answer" use:enhance class="flex flex-wrap gap-3">
			<button class="lm-btn" name="accept" value="1">Accepter l’affectation</button><button
				class="lm-btn"
				data-variant="ghost"
				name="accept"
				value="0">Décliner</button
			>
		</form>{/if}
	{#if d.canApprove}<form method="POST" action="?/approve" use:enhance class="flex flex-wrap gap-3">
			<button class="lm-btn" name="accept" value="1">Approuver ces droits</button><button
				class="lm-btn"
				data-variant="ghost"
				name="accept"
				value="0">Refuser</button
			>
		</form>{/if}
	{#if d.canEnd}<form
			method="POST"
			action="?/end"
			use:enhance
			class="lm-tile lm-tile--flow space-y-3 p-4"
		>
			<label class="flex items-center gap-3"
				><input type="checkbox" name="confirm" value="1" required />Je confirme la fin de
				l’accompagnement de {d.artistName}</label
			><button class="lm-btn" data-variant="danger">Terminer l’accompagnement</button>
		</form>{/if}
	{#if d.canRevoke}<form method="POST" action="?/revoke" use:enhance>
			<button class="lm-btn" data-variant="ghost">Retirer l’affectation</button>
		</form>{/if}
	{#if d.endedAt}<p>Retirée par {d.endedBy ?? 'Compte supprimé'}.</p>{/if}
	<ActivityTimeline
		entries={d.activity}
		title="Historique de l’affectation"
		id="delegation-activity-title"
	/>
</div>
