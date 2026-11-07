<script lang="ts">
	// LINKMUSICIAN: mes groupes (P3-01), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import { ROLE_LABELS, periodLabel } from '#lib/bands/rules';
	import { plural } from '#lib/jam/log';
	import { Plus, UsersRound } from 'lucide-svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.message) toast.success(form.message);
	});
	const empty = $derived(
		data.active.length === 0 && data.invitations.length === 0 && data.requests.length === 0
	);
</script>

<SEO title="Mes groupes" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-7xl space-y-8">
		<div class="space-y-2">
			<a href="/espace" class="text-sm text-muted-foreground underline">← Mon parcours</a>
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h1 class="flex items-center gap-2 text-3xl font-black tracking-tight sm:text-4xl">
					<UsersRound class="size-7" aria-hidden="true" /> Mes groupes
				</h1>
				<a
					href="/groupes/nouveau"
					class="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
				>
					<Plus class="size-4" aria-hidden="true" /> Monter un groupe
				</a>
			</div>
			<p class="text-sm text-muted-foreground">
				Un groupe, c’est comme un club : on garde la trace de qui y a joué, et quand.
			</p>
		</div>

		{#if form?.error}
			<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
				{form.error}
			</p>
		{/if}

		{#if data.invitations.length > 0}
			<section class="space-y-3" aria-labelledby="invites-title">
				<h2 id="invites-title" class="text-xl font-bold">Invitations reçues</h2>
				<ul class="grid gap-3 md:grid-cols-2">
					{#each data.invitations as b (b.membershipId)}
						<li class="space-y-3 rounded-2xl border border-primary bg-card p-4">
							<p>
								<span class="font-semibold">{b.name}</span>
								<span class="block text-sm text-muted-foreground"
									>{b.invitedBy ? `${b.invitedBy} t’invite` : 'Invitation'}{b.title
										? ` · pour : ${b.title}`
										: ''} · {plural(b.members, 'membre')}</span
								>
							</p>
							<div class="flex flex-wrap gap-2">
								<form method="POST" action="?/accept" use:enhance>
									<input type="hidden" name="membershipId" value={b.membershipId} />
									<button
										class="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
										>Rejoindre {b.name}</button
									>
								</form>
								<form method="POST" action="?/decline" use:enhance>
									<input type="hidden" name="membershipId" value={b.membershipId} />
									<button class="min-h-11 rounded-full border px-4">Non merci</button>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if empty}
			<div class="space-y-2 rounded-2xl border bg-card p-6 text-center text-sm">
				<p class="font-semibold">Tu n’as pas encore de groupe.</p>
				<p class="text-muted-foreground">
					Monte le tien et invite les gens avec qui tu as joué, ou réponds à une annonce « cherche
					un membre ».
				</p>
				<a href="/annonces" class="block pt-1 font-semibold underline">Voir les annonces</a>
			</div>
		{/if}

		{#if data.active.length > 0}
			<section class="space-y-3" aria-labelledby="bands-title">
				<h2 id="bands-title" class="text-xl font-bold">Où je joue</h2>
				<ul class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{#each data.active as b (b.membershipId)}
						<li>
							<a
								href="/groupes/{b.handle}"
								class="block min-h-11 space-y-1 rounded-2xl border bg-card p-4 hover:bg-muted"
							>
								<span class="block text-lg font-bold">{b.name}</span>
								<span class="block text-sm text-muted-foreground"
									>{b.formed
										? plural(b.members, 'membre')
										: 'En formation : invite un premier membre'}</span
								>
								<span class="block text-sm text-muted-foreground"
									>{b.role === 'MEMBER' ? '' : `${ROLE_LABELS[b.role]} · `}{b.title
										? `${b.title} · `
										: ''}{periodLabel(b.since ? new Date(b.since) : null, null)}</span
								>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if data.requests.length > 0}
			<section class="space-y-3" aria-labelledby="requests-title">
				<h2 id="requests-title" class="text-xl font-bold">Mes demandes en attente</h2>
				<ul class="grid gap-2 sm:grid-cols-2">
					{#each data.requests as b (b.membershipId)}
						<li class="flex items-center justify-between gap-2 rounded-2xl border bg-card p-4">
							<a href="/groupes/{b.handle}" class="font-semibold underline">{b.name}</a>
							<form method="POST" action="?/withdraw" use:enhance>
								<input type="hidden" name="membershipId" value={b.membershipId} />
								<button class="min-h-11 px-2 text-sm text-muted-foreground underline"
									>Retirer ma demande</button
								>
							</form>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
</div>
