<script lang="ts">
	// LINKMUSICIAN: droit de candidater (DASH-07a), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import {
		GRANT_KIND_LABELS,
		GRANT_STATE_LABELS,
		MAX_GRANT_DAYS,
		type GrantKind
	} from '#lib/representation/applicationGrants';
	import { AGENT_KIND_INFO } from '#lib/representation/rules';

	let { data, form } = $props();
	const v = $derived(data.view);
	const day = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});
	const at = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
	const iso = (d: Date) => d.toISOString().slice(0, 10);
	// Fin proposée : trois mois, sans dépasser le mandat ni six mois.
	const maxEnd = $derived.by(() => {
		const limit = new Date(Date.now() + MAX_GRANT_DAYS * 86_400_000);
		return v.mandateEnd && new Date(v.mandateEnd) < limit ? new Date(v.mandateEnd) : limit;
	});
	const minEnd = iso(new Date(Date.now() + 86_400_000));
	const defaultEnd = $derived.by(() => {
		const three = new Date(Date.now() + 91 * 86_400_000);
		return iso(three < maxEnd ? three : maxEnd);
	});
	const kindsText = (kinds: string[]) =>
		kinds.map((k) => GRANT_KIND_LABELS[k as GrantKind] ?? k).join(', ');
</script>

<SEO title="Droit de candidater" noindex nofollow />
<div class="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-24">
	<MetroPageHeader
		title={v.artistName}
		kicker="Droit de candidater"
		intro={`${v.agentName}, ${AGENT_KIND_INFO[v.agentKind].label.toLowerCase()}`}
	/>
	{#if form && 'error' in form && form.error}
		<p role="alert" class="lm-alert p-3">{form.error}</p>
	{/if}
	{#if form && 'done' in form && form.done}<p role="status">{form.done}</p>{/if}

	<p class="text-sm text-muted-foreground">
		{v.isAgent
			? `Avec ce droit, tu envoies des candidatures au nom de ${v.artistName}.`
			: `Avec ce droit, ${v.agentName} envoie des candidatures en ton nom.`}
		L’accompagnement seul ne le permet pas. Le droit a une date de fin et chacun·e peut y mettre fin à
		tout moment. L’artiste est prévenu·e de chaque candidature et peut la retirer. Aucune signature, aucun
		accès aux conversations privées.
	</p>

	{#if !v.usable}
		<p class="lm-tile p-3 text-sm">
			Cet accompagnement n’est pas en cours : aucun droit n’est actif. On peut encore refuser une
			demande ou mettre fin à un droit.
		</p>
	{/if}

	{#each v.grants.filter((g) => g.state === 'PENDING' || g.state === 'ACTIVE') as g (g.id)}
		<section class="space-y-3 rounded-2xl border bg-card p-4" aria-labelledby="grant-{g.id}">
			<h2 id="grant-{g.id}" class="text-xl font-bold">
				{g.state === 'ACTIVE' && !g.effective ? 'Droit sans effet' : GRANT_STATE_LABELS[g.state]}
			</h2>
			<dl class="grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
				<dt class="font-semibold">Annonces</dt>
				<dd>{kindsText(g.kinds)}</dd>
				<dt class="font-semibold">Jusqu’au</dt>
				<dd>{day.format(new Date(g.expiresAt))} (exclu)</dd>
				{#if g.grantedBy}
					<dt class="font-semibold">Accordé par</dt>
					<dd>{g.grantedBy}</dd>
				{/if}
			</dl>
			{#if g.canAnswer || g.canDecline}
				<form method="POST" action="?/answer" use:enhance class="flex flex-wrap gap-3">
					<input type="hidden" name="grantId" value={g.id} />
					{#if g.canAnswer}<button class="lm-btn" name="accept" value="1">Accorder ce droit</button
						>{/if}
					<button class="lm-btn" data-variant="ghost" name="accept" value="0">Refuser</button>
				</form>
			{/if}
			{#if g.canEnd}
				<form method="POST" action="?/end" use:enhance>
					<input type="hidden" name="grantId" value={g.id} />
					<button class="lm-btn" data-variant="ghost"
						>{g.state === 'PENDING' ? 'Retirer ma demande' : 'Révoquer le droit'}</button
					>
				</form>
			{/if}
		</section>
	{/each}

	{#if v.canRequest}
		<section class="space-y-3 rounded-2xl border bg-card p-4" aria-labelledby="ask">
			<h2 id="ask" class="text-xl font-bold">Demander le droit de candidater</h2>
			{#if v.grantable.length === 0}
				<p class="text-sm text-muted-foreground">
					Un·e booker candidate pour un groupe, à des plateaux. Pour une personne, c’est le rôle
					d’un·e manager.
				</p>
			{:else}
				<form method="POST" action="?/request" use:enhance class="space-y-4">
					<fieldset class="space-y-2">
						<legend class="font-semibold">Annonces couvertes</legend>
						{#each v.grantable as k (k)}
							<label class="flex min-h-11 items-center gap-3">
								<input type="checkbox" name="kinds" value={k} checked />
								{GRANT_KIND_LABELS[k]}
							</label>
						{/each}
						<p class="text-sm text-muted-foreground">
							Les recrutements de groupe ne sont jamais couverts : on rejoint un groupe soi-même.
						</p>
					</fieldset>
					<label class="block space-y-1">
						<span class="font-semibold">Jusqu’au (exclu)</span>
						<input
							type="date"
							name="expiresOn"
							required
							min={minEnd}
							max={iso(maxEnd)}
							value={defaultEnd}
							class="block min-h-11 rounded-xl border bg-background px-3"
						/>
						<span class="block text-sm text-muted-foreground"
							>Six mois au plus, dans la durée de l’accompagnement.</span
						>
					</label>
					<button class="lm-btn">Envoyer la demande</button>
				</form>
			{/if}
		</section>
	{:else if v.isAgent && v.usable && !v.grants.some((g) => g.state === 'PENDING' || g.state === 'ACTIVE')}
		<p class="text-sm text-muted-foreground">Aucun droit en cours.</p>
	{:else if v.isArtist && !v.grants.some((g) => g.state === 'PENDING' || g.state === 'ACTIVE')}
		<p class="text-sm text-muted-foreground">
			Aucun droit demandé. {v.agentName} peut t’en faire la demande depuis cette page.
		</p>
	{/if}

	{#if v.grants.length > 0}
		<details class="rounded-2xl border bg-card p-4">
			<summary class="min-h-11 cursor-pointer font-semibold">Historique du droit</summary>
			<ol class="mt-3 space-y-2 text-sm">
				{#each v.grants as g (g.id)}
					{#each g.acts as a (a.id)}
						<li>
							<span class="font-semibold">{a.label}</span> · {a.by} · {at.format(new Date(a.at))}
							<span class="text-muted-foreground">({kindsText(g.kinds)})</span>
						</li>
					{/each}
					{#if g.state === 'EXPIRED'}
						<li>
							<span class="font-semibold">Droit échu</span> · {day.format(new Date(g.expiresAt))}
						</li>
					{/if}
				{/each}
			</ol>
		</details>
	{/if}
</div>
