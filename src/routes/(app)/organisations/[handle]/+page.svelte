<script lang="ts">
	// LINKMUSICIAN: fiche d'une organisation d'organisateur·rices (P5-05b), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import CommunePicker, {
		type CommuneChoice
	} from '#lib/components/linkmusician/CommunePicker.svelte';
	import OrgVerificationCard from '#lib/components/linkmusician/organizations/OrgVerificationCard.svelte';
	import { ROLE_LABELS } from '#lib/bands/rules';
	import { STATUS_LABELS } from '#lib/opportunities/rules';
	import {
		MAX_CAPACITY,
		MAX_PROMOTER_GENRES,
		PROMOTER_EVENT_KINDS,
		PROMOTER_EVENT_KIND_INFO
	} from '#lib/crafts/promoter';
	import { MAX_PROMOTER_ORG_BIO, MAX_PROMOTER_ORG_NAME } from '#lib/organizations/promoter';

	let { data, form } = $props();
	const org = $derived(data.org);

	$effect(() => {
		if (form?.message) toast.success(form.message);
	});
	$effect(() => {
		if (page.url.searchParams.has('cree'))
			toast.success('Ton organisation est créée : complète sa fiche.');
	});

	// Valeurs initiales seulement : la personne modifie ensuite librement.
	// svelte-ignore state_referenced_locally
	let genreIds = $state<string[]>(data.org.genreIds);
	// svelte-ignore state_referenced_locally
	let eventKinds = $state<string[]>(data.org.eventKinds);
	// svelte-ignore state_referenced_locally
	let commune = $state<CommuneChoice | null>(data.org.commune);
	// svelte-ignore state_referenced_locally
	let bio = $state(data.org.bio ?? '');
	const genresFull = $derived(genreIds.length >= MAX_PROMOTER_GENRES);
	const input = 'w-full rounded-md border bg-background p-2 text-sm font-normal';
	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: 'Europe/Paris'
	});
</script>

<SEO title={org.name} noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-5xl space-y-8">
		<div class="space-y-2">
			<a href="/organisations" class="text-sm text-muted-foreground underline"
				>← Mes organisations</a
			>
			<h1 class="lm-title">{org.name}</h1>
			<p class="text-sm text-muted-foreground">
				Ce que tout le monde voit sur
				<a href="/@{org.handle}" class="underline">sa page publique</a>. On n’enregistre que la
				commune, jamais d’adresse.
			</p>
		</div>

		<!-- Plateaux : l'essentiel en premier. -->
		<section class="space-y-3" aria-labelledby="plateaux">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 id="plateaux" class="text-xl font-bold">Plateaux</h2>
				{#if org.gaps.length === 0}
					<a href="/plateaux/nouveau?au-nom-de={org.handle}" class="lm-btn">Publier un plateau</a>
				{/if}
			</div>
			{#if org.gaps.length > 0}
				<p role="status" class="rounded-xl border bg-muted/40 p-3 text-sm">
					Pour publier un plateau au nom de l’organisation, indique d’abord {org.gaps.join(' et ')}.
				</p>
			{:else if org.gigSlots.length === 0}
				<p class="text-sm text-muted-foreground">
					Pas encore de plateau. Les groupes autour de {org.commune?.nom ?? 'chez vous'} le verront dans
					leurs annonces.
				</p>
			{:else}
				<ul class="space-y-2" aria-label="Plateaux de l’organisation">
					{#each org.gigSlots as g (g.id)}
						<li>
							<a
								href="/annonces/{g.id}"
								class="lm-tile lm-tile--flow flex min-h-11 items-center justify-between gap-3 p-3 text-sm"
							>
								<span class="truncate"
									>{g.title}{g.startsAt ? ` · ${day.format(new Date(g.startsAt))}` : ''}</span
								>
								<span class="shrink-0 text-muted-foreground"
									>{g.pendingApplications > 0
										? `${g.pendingApplications} candidature${g.pendingApplications > 1 ? 's' : ''} · `
										: ''}{STATUS_LABELS[g.status]}</span
								>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		{#if form?.error}
			<p role="alert" class="lm-alert p-3 text-sm">
				{form.error}
			</p>
		{/if}

		<form
			method="POST"
			action="?/save"
			use:enhance={() =>
				async ({ update }) =>
					update({ reset: false })}
			class="space-y-6 border-t pt-8"
			aria-labelledby="fiche"
		>
			<h2 id="fiche" class="text-xl font-bold">Fiche</h2>
			<label class="block space-y-1 font-medium">
				Nom
				<input
					name="name"
					required
					autocomplete="off"
					maxlength={MAX_PROMOTER_ORG_NAME}
					value={org.name}
					class={input}
				/>
			</label>
			<div class="space-y-1">
				<label for="org-bio" class="block font-medium">Présentation</label>
				<textarea
					id="org-bio"
					name="bio"
					rows="4"
					maxlength={MAX_PROMOTER_ORG_BIO}
					bind:value={bio}
					placeholder="Ce que vous organisez, votre ligne artistique, vos lieux habituels…"
					class={input}
				></textarea>
				<p class="text-right text-xs text-muted-foreground">
					{[...bio].length}/{MAX_PROMOTER_ORG_BIO}
				</p>
			</div>
			<CommunePicker id="org-commune" label="Ville de l’organisation" bind:chosen={commune} />
			<fieldset class="space-y-2">
				<legend class="font-medium">Ce que vous organisez</legend>
				<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{#each PROMOTER_EVENT_KINDS as item (item)}
						<label class="lm-tile lm-tile--flow flex cursor-pointer items-start gap-2 p-3">
							<input
								type="checkbox"
								name="eventKinds"
								value={item}
								class="mt-1 size-4 shrink-0"
								bind:group={eventKinds}
							/>
							<span>
								<span class="font-medium">{PROMOTER_EVENT_KIND_INFO[item].label}</span>
								<span class="block text-sm text-muted-foreground"
									>{PROMOTER_EVENT_KIND_INFO[item].hint}</span
								>
							</span>
						</label>
					{/each}
				</div>
			</fieldset>
			<label class="block max-w-xs space-y-1 font-medium">
				Jauge habituelle (facultatif)
				<input
					name="capacity"
					inputmode="numeric"
					pattern="[0-9]*"
					maxlength={String(MAX_CAPACITY).length}
					value={org.capacity ?? ''}
					placeholder="300"
					class={input}
				/>
			</label>
			<section aria-labelledby="genres-title" class="space-y-3">
				<h3 id="genres-title" class="font-medium">
					Genres programmés <span class="text-sm font-normal text-muted-foreground"
						>({genreIds.length}/{MAX_PROMOTER_GENRES})</span
					>
				</h3>
				<details open={genreIds.length === 0}>
					<summary class="min-h-11 cursor-pointer content-center text-sm font-medium text-primary"
						>Choisir les genres</summary
					>
					<div class="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{#each data.genres as genre (genre.id)}
							<fieldset class="lm-tile lm-tile--flow p-3">
								<legend class="sr-only">{genre.name}</legend>
								{#each [genre, ...genre.children] as item, i (item.id)}
									{@const checked = genreIds.includes(item.id)}
									<label
										class="flex cursor-pointer items-center gap-2 py-0.5 text-sm {i === 0
											? 'font-medium'
											: 'pl-5'} {genresFull && !checked ? 'opacity-50' : ''}"
									>
										<input
											type="checkbox"
											name="genreIds"
											value={item.id}
											class="size-4"
											disabled={genresFull && !checked}
											bind:group={genreIds}
										/>
										{item.name}
									</label>
								{/each}
							</fieldset>
						{/each}
					</div>
				</details>
			</section>
			<button class="lm-btn w-full">Enregistrer la fiche</button>
		</form>

		<!-- Organisation vérifiée (P5-02) : SIRET contrôlé dans Sirene, puis à la main. -->
		<div class="border-t pt-8">
			<OrgVerificationCard
				verification={data.verification}
				noun="L’organisation"
				title="Organisation vérifiée"
				error={form && 'verifyError' in form ? (form.verifyError as string) : null}
			/>
		</div>

		<!-- Co-gestion. -->
		<section class="space-y-4 border-t pt-8" aria-labelledby="gestion">
			<div class="space-y-1">
				<h2 id="gestion" class="text-xl font-bold">Gestion</h2>
				<p class="text-sm text-muted-foreground">
					Les personnes qui gèrent l’organisation modifient sa fiche, publient ses plateaux et
					tranchent les candidatures.
				</p>
			</div>
			{#if form?.teamError}
				<p role="alert" class="lm-alert p-3 text-sm">
					{form.teamError}
				</p>
			{/if}
			<ul class="lm-tile lm-tile--flow divide-y">
				{#each org.team as member (member.membershipId)}
					<li class="flex flex-wrap items-center justify-between gap-3 p-3">
						<div>
							<a href="/@{member.handle}" class="font-medium underline">{member.displayName}</a>
							<span class="text-sm text-muted-foreground">
								· {member.status === 'INVITED'
									? 'invitation envoyée'
									: ROLE_LABELS[member.role]}{member.isMe ? ' (toi)' : ''}
							</span>
						</div>
						{#if member.isMe || org.role === 'OWNER' || member.status === 'INVITED'}
							<form method="POST" action="?/removeManager" use:enhance>
								<input type="hidden" name="membershipId" value={member.membershipId} />
								<button class="lm-btn" data-variant="ghost"
									>{member.isMe
										? 'Quitter la gestion'
										: member.status === 'INVITED'
											? 'Annuler l’invitation'
											: 'Retirer'}</button
								>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
			<form
				method="POST"
				action="?/inviteManager"
				use:enhance={() =>
					async ({ update }) =>
						update({ reset: true })}
				class="flex flex-col gap-3 sm:flex-row sm:items-end"
			>
				<label class="block flex-1 space-y-1 font-medium">
					Inviter à gérer
					<input
						name="handle"
						required
						autocomplete="off"
						value={form?.handle ?? ''}
						placeholder="@nom-d-utilisateur"
						class={input}
					/>
					<span class="block text-xs font-normal text-muted-foreground"
						>Son nom d’utilisateur, sur son profil. Elle ou il doit avoir le métier
						d’organisateur·rice, et être majeur·e.</span
					>
				</label>
				<button class="lm-btn" data-variant="ghost">Inviter</button>
			</form>
		</section>
	</div>
</div>
