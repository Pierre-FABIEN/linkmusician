<script lang="ts">
	// LINKMUSICIAN: un groupe (P3-01), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import { MAX_MEMBER_TITLE, ROLE_LABELS, isManager, periodLabel } from '#lib/bands/rules';
	import { plural } from '#lib/jam/log';
	import { Music, PartyPopper, UserPlus, UsersRound } from 'lucide-svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.message) toast.success(form.message);
	});

	const band = $derived(data.band);
	const myRole = $derived(band.my?.role ?? null);
	const manager = $derived(isManager(myRole));
	const owner = $derived(myRole === 'OWNER');
	const member = $derived(band.my?.status === 'ACTIVE');
	const dissolved = $derived(band.dissolvedAt !== null);
	const period = (m: { startedAt: Date | string | null; endedAt: Date | string | null }) =>
		periodLabel(m.startedAt ? new Date(m.startedAt) : null, m.endedAt ? new Date(m.endedAt) : null);
	const day = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Europe/Paris'
	});

	let handle = $state('');
	let confirmLeave = $state(false);
	/** Membre dont le menu de gestion est ouvert. */
	let managing = $state<string | null>(null);
</script>

<SEO title={band.name} noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<div class="mx-auto max-w-2xl space-y-8">
		<div class="space-y-2">
			<a href="/groupes" class="text-sm text-muted-foreground underline">← Mes groupes</a>
			<h1 class="flex items-center gap-2 text-3xl font-black tracking-tight">
				<UsersRound class="size-7" aria-hidden="true" />
				{band.name}
			</h1>
			<p class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
				<a href="/@{band.handle}" class="underline">Voir la page publique</a>
				{#if manager && !dissolved}
					<a href="/groupes/{band.handle}/modifier" class="font-semibold underline"
						>Modifier la fiche du groupe</a
					>
					<a href="/annonces/nouvelle?groupe={band.handle}" class="font-semibold underline"
						>Publier une annonce de recrutement</a
					>
				{/if}
			</p>
			<p class="text-sm text-muted-foreground">
				{#if dissolved}
					Groupe dissous le {day.format(new Date(band.dissolvedAt!))}.
				{:else if band.formedAt}
					Formé le {day.format(new Date(band.formedAt))} · {plural(band.members.length, 'membre')}
				{:else}
					En formation : le groupe est formé dès qu’un premier membre le rejoint.
				{/if}
			</p>
		</div>

		{#if data.created && !band.formedAt}
			<div class="flex gap-3 rounded-2xl border border-primary bg-card p-4 text-sm">
				<PartyPopper class="size-5 shrink-0 text-primary" aria-hidden="true" />
				<p>
					Ton groupe existe. Invite quelqu’un avec qui tu as joué : à son arrivée, le groupe est
					formé et vous gagnez des points tous les deux.
				</p>
			</div>
		{/if}

		{#if form?.error}
			<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
				{form.error}
			</p>
		{/if}

		{#if !dissolved && !band.my}
			<form method="POST" action="?/request" use:enhance>
				<button
					class="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
				>
					<UserPlus class="size-4" aria-hidden="true" /> Demander à rejoindre
				</button>
			</form>
		{:else if band.my?.status === 'REQUESTED'}
			<p class="rounded-2xl border bg-card p-4 text-sm">
				Ta demande est envoyée. Le groupe te répondra ici.
			</p>
		{:else if band.my?.status === 'INVITED'}
			<p class="rounded-2xl border border-primary bg-card p-4 text-sm">
				Le groupe t’invite.
				<a href="/groupes" class="font-semibold underline">Répondre à l’invitation</a>
			</p>
		{/if}

		{#if manager && band.requests.length > 0}
			<section class="space-y-3" aria-labelledby="requests-title">
				<h2 id="requests-title" class="text-xl font-bold">Demandes pour rejoindre</h2>
				<ul class="space-y-2">
					{#each band.requests as r (r.membershipId)}
						<li
							class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-4"
						>
							{#if r.handle}
								<a href="/@{r.handle}" class="font-semibold underline">{r.name}</a>
							{:else}
								<span class="font-semibold">{r.name}</span>
							{/if}
							<div class="flex gap-2">
								<form method="POST" action="?/acceptRequest" use:enhance>
									<input type="hidden" name="membershipId" value={r.membershipId} />
									<button
										class="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
										>Accepter {r.name}</button
									>
								</form>
								<form method="POST" action="?/declineRequest" use:enhance>
									<input type="hidden" name="membershipId" value={r.membershipId} />
									<button class="min-h-11 rounded-full border px-4">Refuser</button>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="space-y-3" aria-labelledby="members-title">
			<h2 id="members-title" class="text-xl font-bold">Membres</h2>
			<ul class="space-y-2" aria-label="Membres actuels">
				{#each band.members as m (m.membershipId)}
					<li class="space-y-2 rounded-2xl border bg-card p-4">
						<div class="flex flex-wrap items-start justify-between gap-2">
							<span>
								{#if m.handle}
									<a href="/@{m.handle}" class="font-semibold underline">{m.name}</a>
								{:else}
									<span class="font-semibold">{m.name}</span>
								{/if}
								{#if m.isMe}<span class="text-sm text-muted-foreground"> (toi)</span>{/if}
								<span class="block text-sm text-muted-foreground"
									>{m.role === 'MEMBER' ? '' : `${ROLE_LABELS[m.role]} · `}{m.title
										? `${m.title} · `
										: ''}{period(m)}</span
								>
							</span>
							{#if manager && !m.isMe && m.role !== 'OWNER' && (owner || m.role === 'MEMBER')}
								<button
									type="button"
									class="min-h-11 px-2 text-sm underline"
									aria-expanded={managing === m.membershipId}
									onclick={() => (managing = managing === m.membershipId ? null : m.membershipId)}
									>Gérer</button
								>
							{/if}
						</div>
						{#if managing === m.membershipId}
							<div class="flex flex-wrap gap-2 border-t pt-2">
								{#if owner}
									<form
										method="POST"
										action={m.role === 'ADMIN' ? '?/demote' : '?/promote'}
										use:enhance
									>
										<input type="hidden" name="membershipId" value={m.membershipId} />
										<button class="min-h-11 rounded-full border px-3 text-sm"
											>{m.role === 'ADMIN'
												? 'Retirer la co-gestion'
												: 'Confier la co-gestion'}</button
										>
									</form>
									<form method="POST" action="?/transfer" use:enhance>
										<input type="hidden" name="membershipId" value={m.membershipId} />
										<button class="min-h-11 rounded-full border px-3 text-sm"
											>Lui transmettre le groupe</button
										>
									</form>
								{/if}
								<form method="POST" action="?/remove" use:enhance>
									<input type="hidden" name="membershipId" value={m.membershipId} />
									<button
										class="min-h-11 rounded-full border border-destructive px-3 text-sm text-destructive"
										>Retirer du groupe</button
									>
								</form>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</section>

		{#if member}
			<section class="space-y-3" aria-labelledby="works-title">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 id="works-title" class="flex items-center gap-2 text-xl font-bold">
						<Music class="size-5" aria-hidden="true" /> Morceaux
					</h2>
					{#if manager && !dissolved}
						<a
							href="/morceaux/nouveau?groupe={band.handle}"
							class="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold"
							>Nouvelle idée</a
						>
					{/if}
				</div>
				{#if data.works.length === 0}
					<p class="text-sm text-muted-foreground">
						Pas encore de morceau. Une idée reste entre vous ; une fois composée avec une maquette,
						elle apparaît sur la page du groupe.
					</p>
				{:else}
					<ul class="space-y-2">
						{#each data.works as w (w.id)}
							<li>
								<a
									href="/morceaux/{w.id}"
									class="flex min-h-11 items-center justify-between gap-2 rounded-2xl border bg-card p-4 hover:border-primary"
								>
									<span class="truncate font-semibold">{w.title}</span>
									<span class="shrink-0 text-xs text-muted-foreground"
										>{w.state === 'COMPOSED' ? 'Composé' : 'Idée'}</span
									>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		{#if manager && !dissolved}
			<section class="space-y-3" aria-labelledby="invite-title">
				<h2 id="invite-title" class="text-xl font-bold">Inviter quelqu’un</h2>
				{#if data.candidates.length > 0}
					<p class="text-sm text-muted-foreground">Ton réseau et tes conversations :</p>
					<ul class="flex flex-wrap gap-2" aria-label="Personnes à inviter">
						{#each data.candidates as c (c.handle)}
							<li>
								<form method="POST" action="?/invite" use:enhance>
									<input type="hidden" name="handle" value={c.handle} />
									<button class="min-h-11 rounded-full border px-3 text-sm hover:bg-muted"
										>Inviter {c.displayName}</button
									>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
				<form
					method="POST"
					action="?/invite"
					class="flex flex-wrap items-end gap-2"
					use:enhance={() =>
						async ({ result, update }) => {
							if (result.type === 'success') handle = '';
							await update({ reset: false });
						}}
				>
					<label class="block grow space-y-1 text-sm font-medium">
						Son identifiant
						<input
							name="handle"
							required
							autocomplete="off"
							bind:value={handle}
							placeholder="@malik-batterie"
							class="w-full rounded-md border bg-background p-2 font-normal"
						/>
					</label>
					<button
						class="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
						>Inviter</button
					>
				</form>
				{#if band.invitations.length > 0}
					<ul class="space-y-2" aria-label="Invitations en attente">
						{#each band.invitations as i (i.membershipId)}
							<li
								class="flex items-center justify-between gap-2 rounded-2xl border bg-card px-4 py-2 text-sm"
							>
								<span>{i.name} · invitation en attente</span>
								<form method="POST" action="?/withdraw" use:enhance>
									<input type="hidden" name="membershipId" value={i.membershipId} />
									<button class="min-h-11 px-2 text-muted-foreground underline">Retirer</button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		{#if band.past.length > 0}
			<section class="space-y-3" aria-labelledby="past-title">
				<h2 id="past-title" class="text-xl font-bold">Ils et elles y ont joué</h2>
				<ul class="space-y-1 text-sm" aria-label="Anciens membres">
					{#each band.past as m (m.membershipId)}
						<li>
							{#if m.handle}
								<a href="/@{m.handle}" class="font-semibold underline">{m.name}</a>
							{:else}
								<span class="font-semibold">{m.name}</span>
							{/if}
							<span class="text-muted-foreground"
								>{m.title ? ` · ${m.title}` : ''} · {period(m)}</span
							>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if member && !dissolved}
			<section class="space-y-3 border-t pt-6" aria-labelledby="me-title">
				<h2 id="me-title" class="text-lg font-bold">Ma place dans le groupe</h2>
				<form method="POST" action="?/title" class="flex flex-wrap items-end gap-2" use:enhance>
					<label class="block grow space-y-1 text-sm font-medium">
						Ce que j’y fais
						<input
							name="title"
							autocomplete="off"
							maxlength={MAX_MEMBER_TITLE}
							value={band.my?.title ?? ''}
							placeholder="basse, chœurs"
							class="w-full rounded-md border bg-background p-2 font-normal"
						/>
					</label>
					<button class="min-h-11 rounded-full border px-4 text-sm">Enregistrer</button>
				</form>
				{#if !confirmLeave}
					<button
						type="button"
						class="min-h-11 text-sm text-muted-foreground underline"
						onclick={() => (confirmLeave = true)}>Quitter le groupe</button
					>
				{:else}
					<div class="space-y-2 rounded-2xl border p-4 text-sm">
						<p>
							{owner && band.members.length <= 1
								? 'Tu es seul·e : quitter le groupe le dissout. Son historique reste.'
								: owner
									? 'Transmets d’abord le groupe à un autre membre (« Gérer »).'
									: 'Tu resteras dans l’historique du groupe, avec tes dates.'}
						</p>
						<div class="flex gap-2">
							{#if !(owner && band.members.length > 1)}
								<form method="POST" action="?/leave" use:enhance>
									<button
										class="min-h-11 rounded-full border border-destructive px-4 text-destructive"
										>{owner ? 'Dissoudre le groupe' : 'Quitter le groupe'}</button
									>
								</form>
							{/if}
							<button
								type="button"
								class="min-h-11 rounded-full border px-4"
								onclick={() => (confirmLeave = false)}>Annuler</button
							>
						</div>
					</div>
				{/if}
			</section>
		{/if}
	</div>
</div>
