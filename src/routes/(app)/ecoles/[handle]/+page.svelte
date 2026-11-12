<script lang="ts">
	// LINKMUSICIAN: une école (P5-11), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { BadgeCheck } from 'lucide-svelte';
	import SEO from '#lib/components/SEO.svelte';
	import SubPageHeader from '#lib/components/linkmusician/SubPageHeader.svelte';
	import {
		DEFAULT_INVITE_USES,
		INVITE_DAYS,
		MAX_INVITE_USES,
		SCHOOL_KIND_LABELS
	} from '#lib/schools/rules';
	import { plural } from '#lib/jam/log';

	let { data, form } = $props();
	const s = $derived(data.school);
	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Paris'
	});
	const short = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
	const btn = 'min-h-11 rounded-full px-4 text-sm font-semibold';
	let copied = $state(false);

	$effect(() => {
		if (form && 'done' in form && form.done) toast.success(form.done);
		if (form && 'error' in form && form.error) toast.error(form.error);
	});
	async function copy(link: string) {
		try {
			await navigator.clipboard.writeText(link);
			copied = true;
		} catch {
			copied = false;
		}
	}
</script>

<SEO title={s.name} noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-8">
		<SubPageHeader
			title={s.name}
			intro="{SCHOOL_KIND_LABELS[s.kind]}{s.manager
				? ' · tu la gères'
				: ''}. Les ateliers sont réservés à ses élèves."
		/>
		{#if s.verified}
			<p class="inline-flex items-center gap-1 text-sm text-muted-foreground">
				<BadgeCheck class="size-4 text-primary" aria-hidden="true" /> École vérifiée
			</p>
		{/if}

		{#if data.created}
			<p class="rounded-2xl border border-primary/50 bg-primary/5 p-4 text-sm">
				Ton école est ouverte. Crée un lien d’invitation et envoie-le à tes élèves, puis publie un
				premier atelier.
			</p>
		{/if}

		<section class="space-y-3" aria-labelledby="workshops">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h2 id="workshops" class="text-xl font-bold">Ateliers à venir</h2>
				{#if s.manager}
					<a
						href="/ecoles/{s.handle}/atelier"
						class="{btn} inline-flex items-center bg-primary text-primary-foreground"
						>Publier un atelier</a
					>
				{/if}
			</div>
			{#if data.workshops.length === 0}
				<p class="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
					Pas d’atelier prévu pour l’instant.
				</p>
			{:else}
				<ul class="space-y-2">
					{#each data.workshops as w (w.id)}
						<li>
							<a
								href="/jams/{w.id}"
								class="block rounded-2xl border bg-card p-4 hover:border-primary"
							>
								<span class="font-semibold">{w.title}</span>
								<span class="block text-sm text-muted-foreground"
									>{day.format(new Date(w.startsAt))} · {w.venue.name}, {w.venue.communeName}</span
								>
								<span class="block text-sm"
									>{w.imComing
										? 'Tu viens ✓'
										: plural(w.coming, 'personne vient', 'personnes viennent')}</span
								>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		{#if s.manager}
			<section class="space-y-3 rounded-2xl border bg-card p-4" aria-labelledby="invite">
				<h2 id="invite" class="text-xl font-bold">Inviter mes élèves</h2>
				<p class="text-sm text-muted-foreground">
					Un lien à envoyer par message ou à afficher en cours. Il sert {INVITE_DAYS} jours, autant de
					fois que tu le choisis. Qui le suit rejoint l’école : personne d’autre ne voit la liste.
				</p>
				{#if form && 'link' in form && form.link}
					<div class="space-y-2 rounded-xl border border-primary/50 bg-primary/5 p-3">
						<label for="invite-link" class="block text-sm font-semibold"
							>Ton lien (copie-le maintenant : il ne s’affichera plus)</label
						>
						<input
							id="invite-link"
							readonly
							value={form.link}
							class="w-full rounded-md border bg-background p-2 text-sm"
						/>
						<button
							type="button"
							class="{btn} border hover:bg-muted"
							onclick={() => copy(form.link)}>{copied ? 'Copié ✓' : 'Copier le lien'}</button
						>
					</div>
				{/if}
				<form method="POST" action="?/invite" use:enhance class="flex flex-wrap items-end gap-3">
					<label class="block space-y-1 text-sm font-medium">
						Nombre de personnes
						<input
							name="uses"
							type="number"
							min="1"
							max={MAX_INVITE_USES}
							value={DEFAULT_INVITE_USES}
							class="w-28 rounded-md border bg-background p-2 font-normal"
						/>
					</label>
					<button class="{btn} bg-primary text-primary-foreground">Créer un lien</button>
				</form>
				{#if data.invites.length > 0}
					<ul class="space-y-2" aria-label="Liens actifs">
						{#each data.invites as i (i.id)}
							<li
								class="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm"
							>
								<span
									>Créé le {short.format(new Date(i.createdAt))} · {i.uses}/{i.maxUses} utilisé{i.uses >
									1
										? 's'
										: ''} · jusqu’au {short.format(new Date(i.expiresAt))}</span
								>
								<form method="POST" action="?/revoke" use:enhance>
									<input type="hidden" name="id" value={i.id} />
									<button class="{btn} border hover:bg-muted">Retirer</button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section class="space-y-2" aria-labelledby="students">
				<h2 id="students" class="text-xl font-bold">
					Mes élèves <span class="text-sm font-normal text-muted-foreground"
						>({data.students.length})</span
					>
				</h2>
				<p class="text-sm text-muted-foreground">Visible de toi seul·e, et de personne d’autre.</p>
				{#if data.students.length > 0}
					<details>
						<summary class="min-h-11 cursor-pointer content-center text-sm font-medium text-primary"
							>Voir la liste</summary
						>
						<ul class="mt-2 space-y-2">
							{#each data.students as st (st.membershipId)}
								<li
									class="flex items-center justify-between gap-2 rounded-xl border bg-card p-3 text-sm"
								>
									<a href="/@{st.handle}" class="font-medium underline">{st.displayName}</a>
									<form method="POST" action="?/remove" use:enhance>
										<input type="hidden" name="membershipId" value={st.membershipId} />
										<button class="{btn} border hover:bg-muted">Retirer</button>
									</form>
								</li>
							{/each}
						</ul>
					</details>
				{/if}
			</section>
		{:else}
			<form method="POST" action="?/leave" use:enhance>
				<input type="hidden" name="membershipId" value={s.membershipId} />
				<button class="{btn} border hover:bg-muted">Quitter l’école</button>
			</form>
		{/if}
	</div>
</div>
