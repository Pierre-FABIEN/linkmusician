<script lang="ts">
	// LINKMUSICIAN: fiche d'un lieu revendiqué (P5-03b), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import OrgVerificationCard from '#lib/components/linkmusician/organizations/OrgVerificationCard.svelte';
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
	import { Circle, ExternalLink, Trash2 } from 'lucide-svelte';
	import MediaUpload from '#lib/components/linkmusician/MediaUpload.svelte';
	import { ROLE_LABELS } from '#lib/bands/rules';
	import { STATUS_LABELS } from '#lib/opportunities/rules';
	import { MAX_CAPACITY } from '#lib/crafts/promoter';
	import {
		MAX_VENUE_GENRES,
		MAX_VENUE_PHOTOS,
		MAX_VENUE_STAGE,
		VENUE_AGE_RULES,
		VENUE_AGE_RULE_INFO,
		VENUE_CONDITIONS,
		VENUE_CONDITION_LABELS,
		VENUE_WEEKDAYS,
		VENUE_WEEKDAY_LABELS
	} from '#lib/venues/profile';
	import { MAX_SERIES_PER_VENUE } from '#lib/jam/series';

	let { data, form } = $props();
	const v = $derived(data.venue);

	$effect(() => {
		if (form?.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});
	$effect(() => {
		if (page.url.searchParams.get('scene') === '1')
			toast.success('Scène ouverte publiée : les 4 prochaines jams sont dans Rencontre.');
	});
	const activeSeries = $derived(data.series.filter((s) => !s.stopped));

	// Valeurs initiales seulement : la personne modifie ensuite librement.
	// svelte-ignore state_referenced_locally
	let genreIds = $state<string[]>(data.venue.genreIds);
	// svelte-ignore state_referenced_locally
	let stage = $state(data.venue.stage);
	const genresFull = $derived(genreIds.length >= MAX_VENUE_GENRES);
	const published = $derived(v.publishedAt !== null);
	const nextQuests = $derived(v.quests.filter((q) => !q.done).slice(0, 3));
	const input = 'w-full rounded-md border bg-background p-2 text-sm font-normal';
	// Photos (P5-03d) : celles qui comptent dans la limite.
	const livePhotos = $derived(v.photos.filter((p) => p.status !== 'REJECTED').length);
	const PHOTO_STATUS: Record<string, string> = {
		PUBLISHED: 'En ligne',
		PENDING_REVIEW: 'En attente de validation',
		PROCESSING: 'En cours',
		REJECTED: 'Refusée'
	};
	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: 'Europe/Paris'
	});
</script>

<SEO title="Gérer {v.name}" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-5xl space-y-8">
		<div class="space-y-2">
			<a href="/lieux/{v.venueId}" class="text-sm text-muted-foreground underline">← Page du lieu</a
			>
			<h1 class="lm-title">{v.name}</h1>
			<p class="text-sm text-muted-foreground">
				{v.communeName} · {published ? 'fiche publiée' : 'fiche en brouillon'}
			</p>
			{#if v.rank.tier}
				<TierBadge id={v.rank.tier.id} label={v.rank.tier.label} prefix="Rang du lieu :" />
			{/if}
		</div>

		<!-- L'essentiel d'abord : la prochaine étape et les dates. -->
		{#if nextQuests.length > 0}
			<section class="space-y-2" aria-labelledby="quests">
				<h2 id="quests" class="text-xl font-bold">Tes prochaines étapes</h2>
				<ul class="space-y-1">
					{#each nextQuests as q (q.id)}
						<li>
							<a href={q.href} class="flex min-h-11 items-center gap-2 text-sm hover:underline">
								<Circle class="size-4 shrink-0 text-primary" aria-hidden="true" />{q.label}
							</a>
						</li>
					{/each}
				</ul>
				<p class="text-xs text-muted-foreground">
					{v.quests.filter((q) => q.done).length} sur {v.quests.length} atteintes{v.rank.next
						? ` · prochain rang : ${v.rank.next.label}`
						: ''}.
				</p>
			</section>
		{/if}

		<section class="space-y-3" aria-labelledby="dates">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 id="dates" class="text-xl font-bold">Dates</h2>
				{#if published}
					<a href="/plateaux/nouveau?lieu={v.venueId}" class="lm-btn">Publier une date</a>
				{/if}
			</div>
			{#if !published}
				<p role="status" class="rounded-xl border bg-muted/40 p-3 text-sm">
					Publie d’abord la fiche du lieu : tu pourras ensuite publier tes dates et chercher des
					groupes.
				</p>
			{:else if v.gigSlots.length === 0}
				<p class="text-sm text-muted-foreground">
					Pas encore de date. Un vendredi à remplir ? Les groupes autour de {v.communeName} verront ta
					date dans leurs annonces.
				</p>
			{:else}
				<ul class="space-y-2" aria-label="Dates du lieu">
					{#each v.gigSlots as g (g.id)}
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

		<!-- Scènes ouvertes récurrentes (P5-04a) : la liste courte, le formulaire à part. -->
		<section class="space-y-3" aria-labelledby="scenes">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 id="scenes" class="text-xl font-bold">Scènes ouvertes</h2>
				<div class="flex flex-wrap gap-2">
					{#if activeSeries.length > 0}
						<!-- Animateur·rices (P5-04b) -->
						<a
							href="/lieux/{v.venueId}/gerer/animation"
							class="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold hover:bg-muted"
							>Qui anime</a
						>
					{/if}
					{#if published && activeSeries.length < MAX_SERIES_PER_VENUE}
						<a
							href="/lieux/{v.venueId}/gerer/scene-ouverte"
							class="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold hover:bg-muted"
							>Publier une scène ouverte</a
						>
					{/if}
				</div>
			</div>
			{#if activeSeries.length === 0}
				<p class="text-sm text-muted-foreground">
					Un bœuf chaque jeudi ? Publie-le une fois : les jams arrivent d’elles-mêmes dans le mode
					jam des musicien·nes autour de {v.communeName}.
				</p>
			{:else}
				<ul class="space-y-2" aria-label="Scènes ouvertes du lieu">
					{#each activeSeries as s (s.id)}
						<li
							class="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm"
						>
							<span class="min-w-0">
								<span class="block font-medium">{s.title}</span>
								<span class="text-muted-foreground"
									>{s.label}, {s.hours}{#if s.lead}, menée par {s.lead
											.displayName}{/if}{#if s.next}. Prochaine&nbsp;: <a
											href="/jams/{s.next.id}"
											class="underline">{day.format(new Date(s.next.startsAt))}</a
										>{/if}</span
								>
							</span>
							<form method="POST" action="?/stopSeries" use:enhance>
								<input type="hidden" name="seriesId" value={s.id} />
								<button
									class="min-h-11 rounded-full border px-4 text-sm font-semibold hover:bg-muted"
									>Arrêter<span class="sr-only"> {s.title}</span></button
								>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<form
			method="POST"
			action="?/save"
			use:enhance={() =>
				async ({ update }) =>
					update({ reset: false })}
			class="space-y-6 border-t pt-8"
			aria-labelledby="fiche"
		>
			<div class="space-y-1">
				<h2 id="fiche" class="text-xl font-bold">Fiche</h2>
				<p class="text-sm text-muted-foreground">
					Ce que les groupes et les organisateur·rices lisent sur la page du lieu. Le matériel se
					règle sur cette page{v.hasBackline ? '' : ' (aucun indiqué pour l’instant)'}.
				</p>
			</div>
			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block space-y-1 font-medium">
					Jauge
					<input
						name="capacity"
						inputmode="numeric"
						pattern="[0-9]*"
						maxlength={String(MAX_CAPACITY).length}
						value={v.capacity ?? ''}
						placeholder="80"
						class={input}
					/>
				</label>
				<label class="block space-y-1 font-medium">
					Accueil des mineur·es
					<select name="ageRule" class={input}>
						{#each VENUE_AGE_RULES as rule (rule)}
							<option value={rule} selected={v.ageRule === rule}
								>{VENUE_AGE_RULE_INFO[rule].label} : {VENUE_AGE_RULE_INFO[rule].hint}</option
							>
						{/each}
					</select>
				</label>
			</div>
			<div class="space-y-1">
				<label for="venue-stage" class="block font-medium">Scène et son</label>
				<textarea
					id="venue-stage"
					name="stage"
					rows="3"
					maxlength={MAX_VENUE_STAGE}
					bind:value={stage}
					placeholder="Petite scène de 4 m sur 3, sono 2 × 500 W, deux retours, éclairage simple."
					class={input}
				></textarea>
				<p class="text-right text-xs text-muted-foreground">
					{[...stage].length}/{MAX_VENUE_STAGE}
				</p>
			</div>
			<fieldset class="space-y-2">
				<legend class="font-medium">Ce que le lieu propose aux artistes</legend>
				<div class="flex flex-wrap gap-2">
					{#each VENUE_CONDITIONS as c (c)}
						<label
							class="lm-tile lm-tile--flow flex min-h-11 cursor-pointer items-center gap-2 px-3"
						>
							<input
								type="checkbox"
								name="conditions"
								value={c}
								checked={v.conditions.includes(c)}
								class="size-4 shrink-0"
							/>
							{VENUE_CONDITION_LABELS[c]}
						</label>
					{/each}
				</div>
			</fieldset>
			<fieldset class="space-y-2">
				<legend class="font-medium">Jours de concerts ou de jams (facultatif)</legend>
				<div class="flex flex-wrap gap-2">
					{#each VENUE_WEEKDAYS as d (d)}
						<label
							class="lm-tile lm-tile--flow flex min-h-11 cursor-pointer items-center gap-2 px-3"
						>
							<input
								type="checkbox"
								name="days"
								value={d}
								checked={v.days.includes(d)}
								class="size-4 shrink-0"
							/>
							{VENUE_WEEKDAY_LABELS[d]}
						</label>
					{/each}
				</div>
			</fieldset>
			<section aria-labelledby="genres-title" class="space-y-3">
				<h3 id="genres-title" class="font-medium">
					Genres programmés <span class="text-sm font-normal text-muted-foreground"
						>({genreIds.length}/{MAX_VENUE_GENRES})</span
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

		<section class="space-y-3" aria-labelledby="publication">
			<h2 id="publication" class="sr-only">Publication</h2>
			{#if published}
				<form
					method="POST"
					action="?/unpublish"
					use:enhance
					class="flex flex-wrap items-center gap-3"
				>
					<p class="text-sm">La fiche est publiée sur la page du lieu.</p>
					<button class="lm-btn" data-variant="ghost">Retirer la fiche</button>
				</form>
			{:else if v.gaps.length > 0}
				<p class="rounded-xl border bg-muted/40 p-3 text-sm">
					Pour publier, il manque : {v.gaps.join(', ')}.
				</p>
			{:else}
				<form method="POST" action="?/publish" use:enhance>
					<button class="lm-btn w-full sm:w-auto">Publier la fiche</button>
				</form>
			{/if}
		</section>

		<!-- Photos du lieu (P5-03d), comme celles d'un studio. -->
		<section class="space-y-4 border-t pt-8" aria-labelledby="photos">
			<div class="space-y-1">
				<h2 id="photos" class="text-xl font-bold">
					Photos <span class="text-sm font-normal text-muted-foreground"
						>({livePhotos}/{MAX_VENUE_PHOTOS})</span
					>
				</h2>
				<p class="text-sm text-muted-foreground">
					La salle, la scène, l’ambiance : ce que les groupes veulent voir avant de venir jouer.
				</p>
			</div>
			{#if v.photos.length > 0}
				<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Photos du lieu">
					{#each v.photos as photo (photo.id)}
						<li class="space-y-1.5">
							{#if photo.fileUrl}
								<img
									src={photo.fileUrl}
									alt={photo.title}
									loading="lazy"
									class="aspect-[4/3] w-full rounded-lg border object-cover"
								/>
							{:else}
								<div class="lm-tile lm-tile--flow aspect-[4/3] w-full bg-muted"></div>
							{/if}
							<p class="truncate text-sm font-medium">{photo.title}</p>
							<p class="text-xs text-muted-foreground">
								{PHOTO_STATUS[photo.status] ?? photo.status}{photo.rejectionReason
									? ` : ${photo.rejectionReason}`
									: ''}
							</p>
							<form method="POST" action="?/deletePhoto" use:enhance>
								<input type="hidden" name="mediaId" value={photo.id} />
								<button
									class="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
								>
									<Trash2 class="size-4" aria-hidden="true" />Retirer<span class="sr-only">
										la photo {photo.title}</span
									>
								</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
			<MediaUpload forHandle={v.orgHandle} disabled={livePhotos >= MAX_VENUE_PHOTOS} />
		</section>

		<!-- Apprendre le métier (08 §14) : la plateforme guide, elle ne gère rien. -->
		<details class="lm-tile lm-tile--flow p-4">
			<summary class="min-h-11 cursor-pointer content-center font-semibold"
				>Apprendre le métier : licence, GUSO, SACEM</summary
			>
			<ul class="mt-2 space-y-1">
				{#each v.learning as l (l.id)}
					<li>
						<a
							href={l.href}
							target={l.external ? '_blank' : undefined}
							rel={l.external ? 'noopener noreferrer' : undefined}
							class="inline-flex min-h-11 items-center gap-2 text-sm text-primary underline"
							>{l.label}{#if l.external}<ExternalLink class="size-3" aria-hidden="true" />{/if}</a
						>
					</li>
				{/each}
			</ul>
		</details>

		<div class="border-t pt-8">
			<OrgVerificationCard
				verification={data.verification}
				noun="Le lieu"
				title="Lieu vérifié"
				error={form && 'verifyError' in form ? (form.verifyError as string) : null}
			/>
		</div>

		<section class="space-y-4 border-t pt-8" aria-labelledby="gestion">
			<div class="space-y-1">
				<h2 id="gestion" class="text-xl font-bold">Gestion</h2>
				<p class="text-sm text-muted-foreground">
					Les personnes qui gèrent le lieu modifient sa fiche, publient ses dates et tranchent les
					candidatures.
				</p>
			</div>
			{#if form?.teamError}
				<p role="alert" class="lm-alert p-3 text-sm">
					{form.teamError}
				</p>
			{/if}
			<ul class="lm-tile lm-tile--flow divide-y">
				{#each v.team as member (member.membershipId)}
					<li class="flex flex-wrap items-center justify-between gap-3 p-3">
						<div>
							<a href="/@{member.handle}" class="font-medium underline">{member.displayName}</a>
							<span class="text-sm text-muted-foreground">
								· {member.status === 'INVITED'
									? 'invitation envoyée'
									: ROLE_LABELS[member.role]}{member.isMe ? ' (toi)' : ''}
							</span>
						</div>
						{#if member.isMe || v.role === 'OWNER' || member.status === 'INVITED'}
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
						>Son nom d’utilisateur, sur son profil. Il faut être majeur·e.</span
					>
				</label>
				<button class="lm-btn" data-variant="ghost">Inviter</button>
			</form>
		</section>
	</div>
</div>
