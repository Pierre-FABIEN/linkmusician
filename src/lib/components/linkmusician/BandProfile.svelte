<script lang="ts">
	// LINKMUSICIAN: page publique d'un groupe `/@handle` (P3-02), mêmes
	// composants que le profil d'une personne. Données : `getPublicBand`.
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import StructuredData from '#lib/components/StructuredData.svelte';
	import MediaPlayer from '#lib/components/linkmusician/MediaPlayer.svelte';
	import * as Card from '#shadcn/card';
	import * as Avatar from '#shadcn/avatar';
	import { Badge } from '#shadcn/badge';
	import { History, MapPin, Megaphone, Music, UserPlus, UsersRound } from 'lucide-svelte';
	import { initialsOf } from '#lib/actors/display';
	import { ROLE_LABELS, periodLabel } from '#lib/bands/rules';
	import { REPORT_REASONS, REPORT_REASON_LABELS, MAX_REPORT_DETAILS } from '#lib/moderation/rules';
	import { seoConfig } from '#lib/seo.config';
	import type { PublicBand } from '#lib/server/bands/public';
	import WorksCard from './works/WorksCard.svelte';

	let {
		band,
		signedIn,
		canReport,
		memberShell
	}: {
		band: Omit<PublicBand, 'id'>;
		signedIn: boolean;
		canReport: boolean;
		memberShell: boolean;
	} = $props();

	const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
	const date = (d: Date | string | null) => (d ? new Date(d) : null);
	const period = (m: { startedAt: Date | string | null; endedAt: Date | string | null }) =>
		periodLabel(date(m.startedAt), date(m.endedAt));
	const monthYear = new Intl.DateTimeFormat('fr-FR', {
		month: 'long',
		year: 'numeric',
		timeZone: 'Europe/Paris'
	});

	const status = $derived(
		band.dissolvedAt
			? `Groupe dissous en ${monthYear.format(new Date(band.dissolvedAt))}`
			: band.formedAt
				? `Groupe formé en ${monthYear.format(new Date(band.formedAt))}`
				: 'Groupe en formation'
	);
	const summary = $derived(
		[
			status,
			plural(band.members.length, 'membre', 'membres'),
			band.genres.slice(0, 3).join(', '),
			band.commune
		]
			.filter(Boolean)
			.join(' · ')
	);
	const description = $derived(
		(band.bio?.trim() || `${band.displayName} sur LinkMusician : ${summary}.`).slice(0, 160)
	);
	const url = $derived(`${seoConfig.site.url}/@${band.handle}`);
	const structured = $derived({
		name: band.displayName,
		alternateName: `@${band.handle}`,
		url,
		description,
		genre: band.genres,
		...(band.formedAt ? { foundingDate: new Date(band.formedAt).toISOString().slice(0, 10) } : {}),
		...(band.commune
			? {
					foundingLocation: {
						'@type': 'Place',
						address: {
							'@type': 'PostalAddress',
							addressLocality: band.commune,
							addressCountry: 'FR'
						}
					}
				}
			: {}),
		// Seuls les membres adultes et visibles sont nommés.
		member: band.members
			.filter((m) => m.listed)
			.map((m) => ({
				'@type': 'OrganizationRole',
				member: { '@type': 'Person', name: m.name, url: `${seoConfig.site.url}/@${m.handle}` },
				...(m.title ? { roleName: m.title } : {}),
				...(m.startedAt ? { startDate: new Date(m.startedAt).toISOString().slice(0, 10) } : {})
			}))
	});
</script>

<SEO title="{band.displayName} (@{band.handle})" {description} {url} noindex={!band.indexable} />
<StructuredData type="MusicGroup" data={structured} />

<div class="min-h-screen w-screen px-4 {memberShell ? 'pt-6 pb-24' : 'py-24'}">
	<div class="mx-auto max-w-5xl space-y-6">
		{#if band.viewer.status === 'ACTIVE'}
			<p class="rounded-lg border bg-muted/40 p-3 text-sm">
				C'est la page publique de ton groupe, telle que les autres la voient.
				<a href="/groupes/{band.handle}" class="underline"
					>{band.viewer.manager ? 'Gérer le groupe' : 'Ma place dans le groupe'}</a
				>
			</p>
		{/if}

		<div class="grid gap-6 lg:grid-cols-3">
			<div class="space-y-6 lg:col-span-2">
				<Card.Root class="overflow-hidden pt-0">
					<div
						class="h-32 bg-violet-900 bg-[radial-gradient(circle_at_20%_30%,var(--color-amber-400),transparent_50%),radial-gradient(circle_at_80%_60%,var(--color-violet-600),transparent_55%)]"
					></div>
					<Card.Content class="-mt-12 space-y-4">
						<div class="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:gap-4">
							<Avatar.Root class="size-24 border-4 border-background shadow-xl">
								<Avatar.Fallback class="bg-amber-100 text-3xl font-bold text-amber-900"
									>{initialsOf(band.displayName)}</Avatar.Fallback
								>
							</Avatar.Root>
							<div class="min-w-0 flex-1">
								<h1 class="text-3xl font-black tracking-tight">{band.displayName}</h1>
								<p class="text-muted-foreground">@{band.handle} · {status}</p>
							</div>
						</div>
						<div class="flex flex-wrap items-center gap-2">
							<Badge variant="secondary"
								><UsersRound class="mr-1 size-3" aria-hidden="true" />{plural(
									band.members.length,
									'membre',
									'membres'
								)}</Badge
							>
							{#if band.commune}
								<span
									class="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
									><MapPin class="size-3" aria-hidden="true" />{band.commune}</span
								>
							{/if}
						</div>
						{#if band.bio}<p class="whitespace-pre-line leading-relaxed">{band.bio}</p>{/if}

						{#if !band.dissolvedAt}
							{#if !signedIn}
								<a href="/auth/login" class="inline-block text-sm underline"
									>Connecte-toi pour rejoindre {band.displayName}</a
								>
							{:else if band.viewer.status === null}
								<form method="POST" action="?/join" use:enhance>
									<button
										class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 font-semibold text-white"
									>
										<UserPlus class="size-4" aria-hidden="true" /> Demander à rejoindre
									</button>
								</form>
							{:else if band.viewer.status === 'REQUESTED'}
								<p class="text-sm text-muted-foreground">Ta demande est envoyée.</p>
							{:else if band.viewer.status === 'INVITED'}
								<a href="/groupes" class="inline-block text-sm font-semibold underline"
									>Le groupe t’invite : répondre</a
								>
							{/if}
						{/if}
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header><Card.Title><h2>Effectif</h2></Card.Title></Card.Header>
					<Card.Content>
						<ul class="space-y-3" aria-label="Membres actuels">
							{#each band.members as m, i (i)}
								<li>
									{#if m.handle}
										<a href="/@{m.handle}" class="font-semibold hover:underline">{m.name}</a>
									{:else}
										<span class="font-semibold">{m.name}</span>
									{/if}
									<span class="block text-sm text-muted-foreground"
										>{m.title ? `${m.title} · ` : ''}{m.role === 'MEMBER'
											? ''
											: `${ROLE_LABELS[m.role]} · `}{period(m)}</span
									>
								</li>
							{/each}
						</ul>
					</Card.Content>
				</Card.Root>

				{#if band.media.length > 0}
					<Card.Root>
						<Card.Header>
							<Card.Title
								><h2 class="flex items-center gap-2">
									<Music class="size-5" aria-hidden="true" /> Écouter
								</h2></Card.Title
							>
						</Card.Header>
						<Card.Content class="grid gap-4 sm:grid-cols-2">
							{#each band.media as m (m.id)}
								<div class="space-y-2 rounded-xl border p-3">
									<MediaPlayer media={m} />
									<p class="text-sm font-medium">
										<a href="/medias/{m.id}" class="hover:underline">{m.title}</a>
									</p>
								</div>
							{/each}
						</Card.Content>
					</Card.Root>
				{/if}
			</div>

			<div class="space-y-6">
				<WorksCard works={band.works} {signedIn} />

				{#if band.recruiting.length > 0}
					<Card.Root class="border-primary">
						<Card.Header>
							<Card.Title
								><h2 class="flex items-center gap-2">
									<Megaphone class="size-5" aria-hidden="true" /> Le groupe recrute
								</h2></Card.Title
							>
						</Card.Header>
						<Card.Content>
							<ul class="space-y-2 text-sm" aria-label="Recrutements ouverts">
								{#each band.recruiting as r (r.id)}
									<li>
										{#if signedIn}
											<a href="/annonces/{r.id}" class="font-semibold underline">{r.title}</a>
										{:else}
											<span class="font-semibold">{r.title}</span>
										{/if}
										{#if r.instrument}<span class="block text-muted-foreground">{r.instrument}</span
											>{/if}
									</li>
								{/each}
							</ul>
							{#if !signedIn}
								<a href="/auth/login" class="mt-3 inline-block text-sm underline"
									>Connecte-toi pour postuler</a
								>
							{/if}
						</Card.Content>
					</Card.Root>
				{/if}

				{#if band.genres.length > 0}
					<Card.Root>
						<Card.Header><Card.Title><h2>Genres</h2></Card.Title></Card.Header>
						<Card.Content class="flex flex-wrap gap-2">
							{#each band.genres as g (g)}<Badge variant="secondary">{g}</Badge>{/each}
						</Card.Content>
					</Card.Root>
				{/if}

				{#if band.past.length > 0}
					<Card.Root>
						<Card.Header>
							<Card.Title
								><h2 class="flex items-center gap-2">
									<History class="size-5" aria-hidden="true" /> Ils et elles y ont joué
								</h2></Card.Title
							>
						</Card.Header>
						<Card.Content>
							<ul class="space-y-2 text-sm" aria-label="Anciens membres">
								{#each band.past as m, i (i)}
									<li>
										{#if m.handle}
											<a href="/@{m.handle}" class="font-semibold hover:underline">{m.name}</a>
										{:else}
											<span class="font-semibold">{m.name}</span>
										{/if}
										<span class="block text-muted-foreground"
											>{m.title ? `${m.title} · ` : ''}{period(m)}</span
										>
									</li>
								{/each}
							</ul>
						</Card.Content>
					</Card.Root>
				{/if}

				{#if canReport && band.viewer.status !== 'ACTIVE'}
					<details class="rounded-lg border p-3 text-sm">
						<summary class="cursor-pointer text-muted-foreground">Signaler ce groupe</summary>
						<form method="POST" action="?/report" use:enhance class="mt-3 space-y-3">
							<div class="space-y-1">
								<label for="reason" class="block font-medium">Motif</label>
								<select
									id="reason"
									name="reason"
									required
									class="w-full rounded-md border bg-background p-2"
								>
									<option value="">—</option>
									{#each REPORT_REASONS as r (r)}
										<option value={r}>{REPORT_REASON_LABELS[r]}</option>
									{/each}
								</select>
							</div>
							<div class="space-y-1">
								<label for="details" class="block font-medium">Précisions (facultatif)</label>
								<textarea
									id="details"
									name="details"
									rows="3"
									maxlength={MAX_REPORT_DETAILS}
									class="w-full rounded-md border bg-background p-2"
								></textarea>
							</div>
							<button type="submit" class="rounded-md border px-3 py-1.5"
								>Envoyer le signalement</button
							>
						</form>
					</details>
				{/if}
			</div>
		</div>
	</div>
</div>
