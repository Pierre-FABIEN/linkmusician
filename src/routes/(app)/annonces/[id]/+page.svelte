<script lang="ts">
	// LINKMUSICIAN: une annonce (P2-02), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import DemarcheCard from '#lib/components/linkmusician/demarches/DemarcheCard.svelte';
	import { Badge } from '#shadcn/badge';
	import { ArrowLeft, CalendarDays, MapPin, Users } from 'lucide-svelte';
	import { OPPORTUNITY_KIND_INFO, STATUS_LABELS } from '#lib/opportunities/rules';
	import { INSTRUMENT_LEVELS } from '#lib/skills/levels';
	import { REPORT_REASONS, REPORT_REASON_LABELS, MAX_REPORT_DETAILS } from '#lib/moderation/rules';
	import {
		APPLICATION_STATUS_LABELS,
		MAX_APPLICATION,
		MIN_APPLICATION,
		isPending
	} from '#lib/opportunities/applications';

	let { data, form } = $props();
	const o = $derived(data.opportunity);
	const eligibleArtists = $derived(data.delegatedOptions.filter((a) => a.unmet.length === 0));

	$effect(() => {
		if (form?.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});
	$effect(() => {
		if (page.url.searchParams.get('publiee') === '1') toast.success('Ton annonce est publiée.');
	});

	const day = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
	// Plateau (P5-05a) : l'heure compte (heure de Paris).
	const dayTime = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Paris'
	});
	const isGig = $derived(o.kind === 'GIG_SLOT');
	const gigBands = $derived(data.gig?.bands ?? []);
	const appliedBands = $derived(gigBands.filter((b) => b.application));
	const openBands = $derived(gigBands.filter((b) => !b.application && b.unmet.length === 0));
	const blockedBands = $derived(gigBands.filter((b) => !b.application && b.unmet.length > 0));
	const levelName = (l: number | null) => (l ? INSTRUMENT_LEVELS[l - 1]?.label : null);
	const conditions = $derived(
		[
			o.target,
			o.instrument &&
				`${o.instrument}${levelName(o.minLevel) ? ` (${levelName(o.minLevel)} ou plus)` : ''}`,
			!o.instrument && levelName(o.minLevel) && `Niveau ${levelName(o.minLevel)} ou plus`,
			o.genre && `Genre : ${o.genre}`,
			o.minTier && `Palier : ${o.minTier} ou plus`,
			// Plateau (P5-05a) : des faits prouvés, jamais l'XP.
			o.minBandTier && `Rang du groupe : ${o.minBandTier} ou plus`,
			o.kind === 'GIG_SLOT' &&
				`Groupes à ${o.radiusKm} km${o.commune ? ` de ${o.commune}` : ''} au plus`,
			// Conditions de l'annonce (ONB-13b, D63).
			...o.conditions.map((c) => `${c.label} : ${c.value}`)
		].filter(Boolean) as string[]
	);
</script>

{#snippet report()}
	<details class="lm-tile lm-tile--flow p-3 text-sm">
		<summary class="cursor-pointer text-muted-foreground">Signaler cette annonce</summary>
		<form method="POST" action="?/report" use:enhance class="mt-3 space-y-3">
			<label class="block space-y-1 font-medium">
				Motif
				<select name="reason" required class="lm-field w-full">
					<option value="">—</option>
					{#each REPORT_REASONS as r (r)}<option value={r}>{REPORT_REASON_LABELS[r]}</option>{/each}
				</select>
			</label>
			<label class="block space-y-1 font-medium">
				Précisions (facultatif)
				<textarea name="details" rows="3" maxlength={MAX_REPORT_DETAILS} class="lm-field w-full"
				></textarea>
			</label>
			<button type="submit" class="lm-btn" data-variant="ghost">Envoyer le signalement</button>
		</form>
	</details>
{/snippet}

<SEO title={o.title} noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<article class="mx-auto max-w-5xl space-y-6 lg:space-y-8">
		<a
			href="/annonces"
			class="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:underline"
		>
			<ArrowLeft class="size-4" aria-hidden="true" /> Annonces
		</a>
		<header class="space-y-2">
			<div class="flex flex-wrap gap-2">
				<Badge variant="secondary">{OPPORTUNITY_KIND_INFO[o.kind].label}</Badge>
				{#if o.status !== 'OPEN'}<Badge variant="outline">{STATUS_LABELS[o.status]}</Badge>{/if}
			</div>
			<h1 class="lm-title">{o.title}</h1>
			<p class="text-sm text-muted-foreground">
				{isGig ? 'Plateau proposé par' : o.issuer.isBand ? 'Le groupe' : 'par'}
				<a href="/@{o.issuer.handle}" class="font-medium underline">{o.issuer.displayName}</a>
				{o.issuer.isBand && !isGig ? 'recrute' : ''}
			</p>
		</header>

		<DemarcheCard nudge={data.demarche} />
		<ul class="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
			{#if o.venue}
				<li class="inline-flex items-center gap-1">
					<MapPin class="size-4" aria-hidden="true" /><span
						><a href="/lieux/{o.venue.id}" class="font-medium underline">{o.venue.name}</a>, {o
							.venue.communeName}</span
					>
				</li>
			{:else if o.commune}<li class="inline-flex items-center gap-1">
					<MapPin class="size-4" aria-hidden="true" />{o.commune}
				</li>{/if}
			{#if o.startsAt}<li class="inline-flex items-center gap-1">
					<CalendarDays class="size-4" aria-hidden="true" />{isGig
						? dayTime.format(new Date(o.startsAt))
						: day.format(new Date(o.startsAt))}
				</li>{/if}
			<li class="inline-flex items-center gap-1">
				<Users class="size-4" aria-hidden="true" />{o.slots}
				{isGig ? `groupe${o.slots > 1 ? 's' : ''} à l’affiche` : `place${o.slots > 1 ? 's' : ''}`}
			</li>
		</ul>

		<p class="max-w-4xl whitespace-pre-line text-base leading-relaxed sm:text-lg">
			{o.description}
		</p>

		{#if o.work}
			<!-- LINKMUSICIAN: morceau concerné (P4-05). -->
			<p class="lm-tile lm-tile--flow p-4 text-sm">
				Pour le morceau
				{#if o.work.linkable}
					<a href="/morceaux/{o.work.id}" class="font-semibold underline">« {o.work.title} »</a>
				{:else}
					<span class="font-semibold">« {o.work.title} »</span>
				{/if}
			</p>
		{/if}
		{#if conditions.length > 0}
			<section class="lm-tile lm-tile--flow p-4" aria-labelledby="conditions-title">
				<h2 id="conditions-title" class="mb-2 font-semibold">Ce qui est recherché</h2>
				<ul class="list-disc space-y-1 pl-5 text-sm">
					{#each conditions as c (c)}<li>{c}</li>{/each}
				</ul>
			</section>
		{/if}

		{#if o.isOwner}
			<section class="lm-tile lm-tile--flow space-y-2 p-4 text-sm">
				<p>
					C'est ton annonce. Visible jusqu'au {day.format(new Date(o.expiresAt))}, à {o.radiusKm} km autour
					de toi.
				</p>
				{#if o.active}
					<form method="POST" action="?/close" use:enhance>
						<button type="submit" class="lm-btn" data-variant="ghost">Clôturer l'annonce</button>
					</form>
				{/if}
			</section>

			<section class="space-y-3" aria-labelledby="applications-title">
				<h2 id="applications-title" class="text-lg font-semibold">
					Candidatures ({data.applications.length})
				</h2>
				{#if data.applications.length === 0}
					<p class="text-sm text-muted-foreground">
						{isGig
							? 'Pas encore de candidature. Les groupes autour de toi voient ton plateau dans leurs annonces.'
							: 'Pas encore de candidature. Les musicien·nes autour de toi la voient dans leurs annonces.'}
					</p>
				{:else}
					<ul class="grid gap-3 lg:grid-cols-2" aria-label="Candidatures reçues">
						{#each data.applications as a (a.id)}
							<li class="lm-tile lm-tile--flow space-y-2 p-4">
								<div class="flex flex-wrap items-center justify-between gap-2">
									<span class="font-semibold">
										{#if a.applicant.handle}
											<a href="/@{a.applicant.handle}" class="hover:underline"
												>{a.applicant.displayName}</a
											>
										{:else}{a.applicant.displayName}{/if}
									</span>
									<Badge variant={a.status === 'ACCEPTED' ? 'default' : 'outline'}
										>{APPLICATION_STATUS_LABELS[a.status]}</Badge
									>
								</div>
								{#if a.applicant.isBand}
									<p class="text-xs text-muted-foreground">
										Groupe{a.applicant.bandTier ? ` · rang ${a.applicant.bandTier}` : ''}
									</p>
								{/if}
								{#if a.applicant.instruments.length > 0}
									<p class="text-xs text-muted-foreground">
										{a.applicant.instruments
											.map((i) => `${i.name} · ${levelName(i.level)}`)
											.join(' — ')}
									</p>
								{/if}
								{#if a.delegatedBy}<p class="text-sm text-muted-foreground">
										Envoyée au nom de l’artiste par {a.delegatedBy}.
									</p>{/if}
								<p class="whitespace-pre-line text-sm">{a.message}</p>
								{#if isPending(a.status)}
									<div class="flex flex-wrap gap-2">
										<form method="POST" action="?/accept" use:enhance>
											<input type="hidden" name="applicationId" value={a.id} />
											<button class="lm-btn">Accepter</button>
										</form>
										{#if a.status !== 'SHORTLISTED'}
											<form method="POST" action="?/shortlist" use:enhance>
												<input type="hidden" name="applicationId" value={a.id} />
												<button class="lm-btn" data-variant="ghost">Présélectionner</button>
											</form>
										{/if}
										<form method="POST" action="?/decline" use:enhance>
											<input type="hidden" name="applicationId" value={a.id} />
											<button class="lm-btn" data-variant="ghost">Refuser</button>
										</form>
									</div>
								{:else if a.conversationId}
									<a
										href="/messages/{a.conversationId}"
										class="inline-block font-semibold underline">Ouvrir la conversation</a
									>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{:else if data.gig}
			<!-- LINKMUSICIAN: plateau (P5-05a) : candidater au nom d'un groupe. -->
			{#if !data.gig.adult}
				<p class="rounded-2xl border bg-muted/40 p-4 text-sm">
					Avant 18 ans, on ne candidate pas à un plateau : une personne majeure qui gère ton groupe
					peut le faire.
				</p>
			{:else if gigBands.length === 0}
				<p class="rounded-2xl border bg-muted/40 p-4 text-sm">
					Un plateau se candidate au nom d’un groupe que tu gères.
					<a href="/groupes" class="font-semibold underline">Mes groupes</a>
				</p>
			{/if}
			{#if appliedBands.length > 0}
				<section class="lm-tile lm-tile--flow space-y-2 p-4 text-sm" aria-labelledby="mine-title">
					<h2 id="mine-title" class="font-semibold">Candidatures de tes groupes</h2>
					<ul class="space-y-2">
						{#each appliedBands as b (b.handle)}
							{@const app = b.application!}
							<li class="flex flex-wrap items-center justify-between gap-2">
								<span>
									<span class="font-semibold">{b.name}</span> :
									{APPLICATION_STATUS_LABELS[app.status]}
								</span>
								{#if app.status === 'ACCEPTED' && app.conversationId}
									<a href="/messages/{app.conversationId}" class="font-semibold underline"
										>Ouvrir la conversation</a
									>
								{:else if isPending(app.status)}
									<form method="POST" action="?/withdrawBand" use:enhance>
										<input type="hidden" name="applicationId" value={app.id} />
										<button class="lm-btn" data-variant="ghost">Retirer</button>
									</form>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/if}
			{#if data.gig.adult && o.active && blockedBands.length > 0}
				<section
					class="lm-tile lm-tile--flow space-y-1 p-4 text-sm"
					aria-label="Groupes hors conditions"
				>
					{#each blockedBands as b (b.handle)}
						<p>
							<span class="font-semibold">{b.name}</span>{b.tier ? ` (rang ${b.tier})` : ''} ne peut pas
							candidater : {b.unmet.join(', ')}.
						</p>
					{/each}
					<a href="/groupes/{blockedBands[0].handle}" class="inline-block font-semibold underline"
						>Voir la fiche du groupe</a
					>
				</section>
			{/if}
			{#if data.gig.adult && o.active && openBands.some((b) => b.unknown.length > 0)}
				<!-- ONB-13b : non précisé, jamais exclusif. -->
				<p class="text-sm text-muted-foreground">
					{#each openBands.filter((b) => b.unknown.length > 0) as b (b.handle)}
						<span class="block"
							>{b.name} : non précisé ({b.unknown.join(', ')}). Le groupe peut candidater ; préciser
							sa fiche aide l’organisation à choisir.</span
						>
					{/each}
				</p>
			{/if}
			{#if data.gig.adult && o.active && openBands.length > 0}
				<form
					method="POST"
					action="?/applyBand"
					use:enhance
					class="lm-tile lm-tile--flow space-y-3 p-4"
					aria-labelledby="apply-title"
				>
					<h2 id="apply-title" class="font-semibold">Candidater avec un groupe</h2>
					<label class="block space-y-1 text-sm font-medium">
						Groupe
						<select name="band" required class="lm-field w-full">
							{#each openBands as b (b.handle)}
								<option value={b.handle}>{b.name}{b.tier ? ` · rang ${b.tier}` : ''}</option>
							{/each}
						</select>
					</label>
					<label class="block space-y-1 text-sm font-medium">
						Ton message à {o.issuer.displayName}
						<textarea
							name="message"
							required
							rows="4"
							minlength={MIN_APPLICATION}
							maxlength={MAX_APPLICATION}
							placeholder="Votre style, la durée de votre set, un lien d’écoute, vos besoins techniques…"
							class="lm-field w-full"
						></textarea>
					</label>
					<button type="submit" class="lm-btn">Envoyer la candidature du groupe</button>
				</form>
			{/if}
			{@render report()}
		{:else}
			{#if data.mine}
				<section class="lm-tile lm-tile--flow space-y-2 p-4 text-sm" aria-labelledby="mine-title">
					<h2 id="mine-title" class="font-semibold">
						Ta candidature : {APPLICATION_STATUS_LABELS[data.mine.status]}
					</h2>
					{#if data.mine.delegated}
						<p>
							Envoyée en ton nom par {data.mine.sentBy?.displayName ?? 'Compte supprimé'}. En cas
							d’acceptation, ton agent échange avec l’organisation.
						</p>
					{/if}
					{#if data.mine.status === 'ACCEPTED' && data.mine.conversationId && !data.mine.delegated}
						<p>
							{#if o.issuer.isBand && o.kind === 'RECRUIT_MEMBER'}
								Bravo ! Tu fais maintenant partie de {o.issuer.displayName}. La conversation est
								ouverte.
							{:else}
								Bravo ! {o.issuer.displayName} a accepté : la conversation est ouverte.
							{/if}
						</p>
						<a
							href="/messages/{data.mine.conversationId}"
							class="inline-block font-semibold underline">Ouvrir la conversation</a
						>
					{:else if isPending(data.mine.status)}
						<form method="POST" action="?/withdraw" use:enhance>
							<input type="hidden" name="applicationId" value={data.mine.id} />
							<button class="lm-btn" data-variant="ghost">Retirer ma candidature</button>
						</form>
					{/if}
				</section>
			{:else if o.active && data.unmet.length > 0}
				<p class="rounded-2xl border bg-muted/40 p-4 text-sm">
					Cette annonce demande des conditions que ton profil ne remplit pas encore : {data.unmet.join(
						', '
					)}.
					<a href="/profil/musical" class="font-semibold underline"
						>Mettre à jour mon profil musical</a
					>
				</p>
			{:else if o.active}
				{#if data.unknown.length > 0}
					<!-- ONB-13b : non précisé, jamais exclusif. -->
					<p class="text-sm text-muted-foreground">
						Non précisé : {data.unknown.join(', ')}. Tu peux postuler ; préciser ton profil aide
						{o.issuer.displayName} à te répondre.
					</p>
				{/if}
				<form
					method="POST"
					action="?/apply"
					use:enhance
					class="lm-tile lm-tile--flow space-y-3 p-4"
					aria-labelledby="apply-title"
				>
					<h2 id="apply-title" class="font-semibold">Postuler</h2>
					<label class="block space-y-1 text-sm font-medium">
						Ton message à {o.issuer.displayName}
						<textarea
							name="message"
							required
							rows="4"
							minlength={MIN_APPLICATION}
							maxlength={MAX_APPLICATION}
							placeholder="Présente-toi : ce que tu joues, depuis quand, tes disponibilités…"
							class="lm-field w-full"
						></textarea>
					</label>
					<button type="submit" class="lm-btn">Envoyer ma candidature</button>
				</form>
			{/if}
			{@render report()}
		{/if}
		{#if data.delegatedApplications.length > 0}
			<section
				class="lm-tile lm-tile--flow space-y-3 p-4"
				aria-labelledby="delegated-history-title"
			>
				<h2 id="delegated-history-title" class="font-semibold">Candidatures déléguées</h2>
				<ul class="space-y-3">
					{#each data.delegatedApplications as app (app.id)}
						<li class="space-y-2 text-sm">
							<p>
								<strong>{app.artist}</strong> : {APPLICATION_STATUS_LABELS[app.status]}. Envoyée en
								son nom par {app.sender}.
							</p>
							{#if isPending(app.status)}
								<form method="POST" action="?/withdraw" use:enhance>
									<input type="hidden" name="applicationId" value={app.id} />
									<button class="lm-btn" data-variant="ghost"
										>Retirer la candidature pour {app.artist}</button
									>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
		{#if !o.isOwner && o.active && eligibleArtists.length > 0}
			<form
				method="POST"
				action="?/applyDelegated"
				use:enhance
				class="lm-tile lm-tile--flow space-y-3 p-4"
				aria-labelledby="delegated-apply-title"
			>
				<h2 id="delegated-apply-title" class="font-semibold">Candidater au nom d’un artiste</h2>
				<p class="text-sm">
					Son accord t’autorise à envoyer directement. L’artiste sera prévenu et pourra retirer la
					candidature. Tu échangeras avec l’organisation si elle accepte.
				</p>
				<label class="block space-y-1 text-sm font-medium"
					>Artiste représenté
					<select name="artistId" required class="lm-field w-full">
						{#each eligibleArtists as artist (artist.id)}
							<option value={artist.id}>{artist.name}</option>
						{/each}
					</select>
				</label>
				{#each eligibleArtists.filter((a) => a.unknown.length > 0) as artist (artist.id)}
					<p class="text-sm text-muted-foreground">
						{artist.name} : non précisé ({artist.unknown.join(', ')}).
					</p>
				{/each}
				<label class="block space-y-1 text-sm font-medium"
					>Message à {o.issuer.displayName}, au nom de l’artiste
					<textarea
						name="message"
						required
						rows="4"
						minlength={MIN_APPLICATION}
						maxlength={MAX_APPLICATION}
						class="lm-field w-full"
					></textarea>
				</label>
				<button class="lm-btn" type="submit">Envoyer au nom de l’artiste</button>
			</form>
		{/if}
		{#each data.delegatedOptions.filter((a) => a.unmet.length > 0) as artist (artist.id)}
			<p class="text-sm">{artist.name} ne peut pas candidater : {artist.unmet.join(', ')}.</p>
		{/each}
	</article>
</div>
