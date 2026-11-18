<script lang="ts">
	// LINKMUSICIAN: « À traiter » (U0), voir +page.server.ts. Une section par
	// nature ; une section vide disparaît.
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import { plural } from '#lib/jam/log';

	let { data } = $props();
	const empty = $derived(
		data.collaborations.length === 0 &&
			data.credits.length === 0 &&
			data.bandInvitations.length === 0 &&
			data.representations === 0 &&
			data.applications === 0 &&
			data.contactRequests === 0
	);
</script>

<SEO title="À traiter" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<MetroPageHeader
			kicker="Collab"
			title="À traiter"
			intro="Ce qui attend ta réponse. Une confirmation des deux côtés, et ça compte dans vos parcours."
			back={{ href: '/espace', label: 'Mon espace' }}
		/>
		{#if empty}
			<p class="lm-tile lm-tile--flow p-4 text-sm text-muted-foreground">
				Rien en attente pour l’instant.
			</p>
		{/if}
		{#if data.collaborations.length > 0}
			<section class="space-y-2" aria-labelledby="collabs-title">
				<h2 id="collabs-title" class="text-xl font-bold">Collaborations</h2>
				<ul class="space-y-2" aria-label="Collaborations à confirmer">
					{#each data.collaborations as k (k.id)}
						<li>
							<a
								href={k.href}
								class="lm-tile lm-tile--flow flex min-h-11 items-center justify-between gap-3 p-3 text-sm"
							>
								<span class="min-w-0 truncate">{k.title} · avec {k.with}</span>
								<span class="shrink-0 font-semibold text-primary"
									>{k.step === 'respond' ? 'Répondre' : 'Confirmer'} →</span
								>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
		{#if data.credits.length > 0}
			<section class="space-y-2" aria-labelledby="credits-title">
				<h2 id="credits-title" class="text-xl font-bold">Crédits de morceaux</h2>
				<ul class="space-y-2" aria-label="Crédits à confirmer">
					{#each data.credits as c (c.workId)}
						<li>
							<a
								href="/morceaux/{c.workId}#credits-title"
								class="lm-tile lm-tile--flow flex min-h-11 items-center justify-between gap-3 p-3 text-sm"
							>
								<span class="min-w-0 truncate">« {c.title} »</span>
								<span class="shrink-0 font-semibold text-primary">Confirmer mon rôle →</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
		{#if data.bandInvitations.length > 0}
			<section class="space-y-2" aria-labelledby="bands-title">
				<h2 id="bands-title" class="text-xl font-bold">Invitations de groupe</h2>
				<ul class="space-y-2" aria-label="Invitations de groupe">
					{#each data.bandInvitations as b (b.bandId)}
						<li>
							<a
								href="/groupes"
								class="lm-tile lm-tile--flow flex min-h-11 items-center justify-between gap-3 p-3 text-sm"
							>
								<span class="min-w-0 truncate">{b.name}</span>
								<span class="shrink-0 font-semibold text-primary">Répondre →</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
		{#if data.representations > 0 || data.applications > 0 || data.contactRequests > 0}
			<section class="space-y-2" aria-labelledby="other-title">
				<h2 id="other-title" class="text-xl font-bold">Autres demandes</h2>
				<ul class="space-y-2" aria-label="Autres demandes">
					{#if data.representations > 0}
						<li>
							<a
								href="/accompagnement"
								class="lm-tile lm-tile--flow flex min-h-11 items-center justify-between gap-3 p-3 text-sm"
							>
								<span class="min-w-0"
									>{plural(
										data.representations,
										'proposition d’accompagnement',
										'propositions d’accompagnement'
									)}</span
								>
								<span class="shrink-0 font-semibold text-primary">Répondre →</span>
							</a>
						</li>
					{/if}
					{#if data.applications > 0}
						<li>
							<a
								href="/annonces"
								class="lm-tile lm-tile--flow flex min-h-11 items-center justify-between gap-3 p-3 text-sm"
							>
								<span class="min-w-0"
									>{plural(data.applications, 'candidature reçue', 'candidatures reçues')}</span
								>
								<span class="shrink-0 font-semibold text-primary">Voir mes annonces →</span>
							</a>
						</li>
					{/if}
					{#if data.contactRequests > 0}
						<li>
							<a
								href="/messages"
								class="lm-tile lm-tile--flow flex min-h-11 items-center justify-between gap-3 p-3 text-sm"
							>
								<span class="min-w-0"
									>{plural(data.contactRequests, 'demande de contact', 'demandes de contact')}</span
								>
								<span class="shrink-0 font-semibold text-primary">Voir les demandes →</span>
							</a>
						</li>
					{/if}
				</ul>
			</section>
		{/if}
	</div>
</div>
