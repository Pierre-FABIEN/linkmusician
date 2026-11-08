<script lang="ts">
	// LINKMUSICIAN: à confirmer, voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import SubPageHeader from '#lib/components/linkmusician/SubPageHeader.svelte';
	import { plural } from '#lib/jam/log';

	let { data } = $props();
	const empty = $derived(
		data.toConfirm.length === 0 && data.bandInvitations === 0 && data.workCredits === 0
	);
</script>

<SEO title="À confirmer" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<SubPageHeader
			title="À confirmer"
			intro="Ce qui attend ta réponse. Une confirmation des deux côtés, et ça compte dans vos parcours."
		/>
		{#if empty}
			<p class="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
				Rien à confirmer pour l’instant.
			</p>
		{/if}
		{#if data.toConfirm.length > 0}
			<section class="space-y-2" aria-labelledby="collabs-title">
				<h2 id="collabs-title" class="text-xl font-bold">Collaborations</h2>
				<ul class="space-y-2" aria-label="Collaborations à confirmer">
					{#each data.toConfirm as k (k.id)}
						<li>
							<a
								href="/messages/{k.conversationId}"
								class="flex min-h-11 items-center justify-between gap-3 rounded-xl border bg-card p-3 text-sm hover:border-primary"
							>
								<span class="truncate">{k.title} · avec {k.with}</span>
								<span class="shrink-0 font-semibold text-primary">Confirmer →</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
		{#if data.workCredits > 0}
			<a
				href="/morceaux"
				class="flex min-h-14 items-center justify-between rounded-2xl border bg-card p-4 hover:border-primary"
			>
				<span class="font-semibold"
					>{plural(data.workCredits, 'crédit de morceau', 'crédits de morceaux')}</span
				>
				<span class="text-sm font-semibold text-primary">Confirmer mon rôle →</span>
			</a>
		{/if}
		{#if data.bandInvitations > 0}
			<a
				href="/groupes"
				class="flex min-h-14 items-center justify-between rounded-2xl border bg-card p-4 hover:border-primary"
			>
				<span class="font-semibold"
					>{plural(data.bandInvitations, 'invitation de groupe', 'invitations de groupe')}</span
				>
				<span class="text-sm font-semibold text-primary">Répondre →</span>
			</a>
		{/if}
	</div>
</div>
