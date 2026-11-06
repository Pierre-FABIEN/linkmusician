<script lang="ts">
	// LINKMUSICIAN: profil public `/@handle` (P1-11), d'après la maquette validée
	// `/_lab/profil`. Voir +page.server.ts.
	import Suggestions from '#lib/components/linkmusician/Suggestions.svelte';
	import BandProfile from '#lib/components/linkmusician/BandProfile.svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import StructuredData from '#lib/components/StructuredData.svelte';
	import * as Card from '#shadcn/card';
	import * as Avatar from '#shadcn/avatar';
	import { Badge } from '#shadcn/badge';
	import {
		Handshake,
		Mic2,
		Users,
		ThumbsUp,
		Music,
		MapPin,
		CalendarCheck,
		Link2,
		MessageCircle,
		Disc3,
		Clock
	} from 'lucide-svelte';
	import LevelBadge from '#lib/components/linkmusician/progress/LevelBadge.svelte';
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
	import InstrumentSkill from '#lib/components/linkmusician/progress/InstrumentSkill.svelte';
	import AchievementBadge from '#lib/components/linkmusician/progress/AchievementBadge.svelte';
	import MediaPlayer from '#lib/components/linkmusician/MediaPlayer.svelte';
	import { TRACKS } from '#lib/actors/tracks';
	import { initialsOf } from '#lib/actors/display';
	import {
		LINK_INFO,
		LOOKING_FOR_LABELS,
		proStatusLabel,
		yearsOfPractice
	} from '#lib/actors/profile';
	import { REPORT_REASONS, REPORT_REASON_LABELS, MAX_REPORT_DETAILS } from '#lib/moderation/rules';
	import { seoConfig } from '#lib/seo.config';
	import { periodLabel } from '#lib/bands/rules';

	let { data, form } = $props();

	$effect(() => {
		if (form?.reported) toast.success(form.reported);
		if (form?.joined) toast.success(form.joined);
		if (form?.error) toast.error(form.error);
	});

	// Une personne ; la page d'un groupe (P3-02) passe par `BandProfile`. Les
	// valeurs dérivées ci-dessous ne sont lues que dans la branche « personne ».
	const p = $derived(data.profile!);
	const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
	const trackLabels = $derived(p.tracks.map((t) => TRACKS[t.track].label));
	const practiceYears = $derived(p.practiceSince ? yearsOfPractice(p.practiceSince) : null);

	/** Faits confirmés par d'autres (pas un score). */
	const confirmed = $derived(
		[
			p.confirmed.collaborations > 0 && {
				icon: Handshake,
				text: `${plural(p.confirmed.collaborations, 'collaboration confirmée', 'collaborations confirmées')} avec ${plural(p.confirmed.distinctCollaborators, 'personne', 'personnes')}`
			},
			p.confirmed.bands > 0 && {
				icon: Users,
				text: `Membre de ${plural(p.confirmed.bands, 'groupe', 'groupes')}`
			},
			p.confirmed.corroboratedGigs > 0 && {
				icon: Mic2,
				text: plural(p.confirmed.corroboratedGigs, 'concert corroboré', 'concerts corroborés')
			},
			p.confirmed.verifiedReleases > 0 && {
				icon: Disc3,
				text: plural(p.confirmed.verifiedReleases, 'sortie vérifiée', 'sorties vérifiées')
			},
			p.confirmed.distinctEndorsers > 0 && {
				icon: ThumbsUp,
				text: `Recommandé·e par ${plural(p.confirmed.distinctEndorsers, 'personne', 'personnes')}`
			},
			p.confirmed.respondsWithin !== null && {
				icon: Clock,
				text: `Répond généralement sous ${p.confirmed.respondsWithin === '24h' ? '24' : '48'} h`
			}
		].filter((s) => s !== false)
	);

	const summary = $derived(
		[
			trackLabels[0],
			p.instruments
				.map((i) => i.name)
				.slice(0, 3)
				.join(', '),
			p.genres.slice(0, 3).join(', '),
			p.commune
		]
			.filter(Boolean)
			.join(' · ')
	);
	const description = $derived(
		(p.bio?.trim() || `${p.displayName} sur LinkMusician : ${summary}.`).slice(0, 160)
	);
	const url = $derived(`${seoConfig.site.url}/@${p.handle}`);

	/** Données structurées : `Person` pour une personne, `MusicGroup` pour un groupe. */
	const structured = $derived(
		p.kind === 'PERSON'
			? {
					type: 'Person' as const,
					data: {
						name: p.displayName,
						alternateName: `@${p.handle}`,
						url,
						description,
						...(trackLabels[0] ? { jobTitle: trackLabels[0] } : {}),
						knowsAbout: [...p.instruments.map((i) => i.name), ...p.genres],
						...(p.commune
							? {
									homeLocation: {
										'@type': 'Place',
										address: {
											'@type': 'PostalAddress',
											addressLocality: p.commune,
											addressCountry: 'FR'
										}
									}
								}
							: {}),
						sameAs: p.links.map((l) => l.url)
					}
				}
			: {
					type: 'MusicGroup' as const,
					data: {
						name: p.displayName,
						alternateName: `@${p.handle}`,
						url,
						description,
						genre: p.genres,
						sameAs: p.links.map((l) => l.url)
					}
				}
	);
</script>

{#if data.band}
	<BandProfile
		band={data.band}
		signedIn={data.signedIn}
		canReport={data.canReport}
		memberShell={Boolean(data.memberShell)}
	/>
{:else}
	<SEO title="{p.displayName} (@{p.handle})" {description} {url} noindex={!p.indexable} />
	<StructuredData type={structured.type} data={structured.data} />

	<div class="min-h-screen w-screen px-4 {data.memberShell ? 'pt-6 pb-24' : 'py-24'}">
		<div class="mx-auto max-w-5xl space-y-6">
			{#if data.isOwner}
				<p class="rounded-lg border bg-muted/40 p-3 text-sm">
					C'est ton profil public, tel que les autres le voient.
					<a href="/profil" class="underline">Modifier</a> ·
					<a href="/reglages" class="underline">Masquer</a>
				</p>
			{/if}

			<div class="grid gap-6 lg:grid-cols-3">
				<div class="space-y-6 lg:col-span-2">
					<Card.Root class="overflow-hidden pt-0">
						<div
							class="h-32 bg-violet-900 bg-[radial-gradient(circle_at_20%_30%,var(--color-fuchsia-400),transparent_50%),radial-gradient(circle_at_80%_60%,var(--color-violet-600),transparent_55%)]"
						></div>
						<Card.Content class="-mt-12 space-y-4">
							<div
								class="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4"
							>
								<Avatar.Root class="size-24 border-4 border-background shadow-xl">
									<Avatar.Fallback class="bg-violet-100 text-3xl font-bold text-violet-800"
										>{initialsOf(p.displayName)}</Avatar.Fallback
									>
								</Avatar.Root>
								<div class="min-w-0 flex-1">
									<h1 class="text-3xl font-black tracking-tight">{p.displayName}</h1>
									<p class="text-muted-foreground">
										@{p.handle}{trackLabels.length ? ` · ${trackLabels.join(' · ')}` : ''}
									</p>
								</div>
								<LevelBadge level={p.level} size="sm" />
							</div>
							<div class="flex flex-wrap items-center gap-2">
								{#if p.tier}<TierBadge {...p.tier} />{/if}
								{#if p.proStatus}<Badge variant="secondary">{proStatusLabel(p.proStatus)}</Badge
									>{/if}
								{#if p.commune}
									<span
										class="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
										><MapPin class="size-3" aria-hidden="true" />{p.commune}</span
									>
								{/if}
								{#if practiceYears !== null && practiceYears > 0}
									<Badge variant="outline">joue depuis {plural(practiceYears, 'an', 'ans')}</Badge>
								{/if}
							</div>
							{#if p.bio}<p class="whitespace-pre-line leading-relaxed">{p.bio}</p>{/if}
							{#if data.canReport}
								<a
									href="/messages/nouveau?a={p.handle}"
									class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 font-semibold text-white"
								>
									<MessageCircle class="size-4" aria-hidden="true" /> Écrire à {p.displayName}
								</a>
							{:else if !data.isOwner}
								<a href="/auth/login" class="inline-block text-sm underline"
									>Connecte-toi pour écrire à {p.displayName}</a
								>
							{/if}
						</Card.Content>
					</Card.Root>

					{#if p.instruments.length > 0}
						<Card.Root>
							<Card.Header><Card.Title><h2>Instruments</h2></Card.Title></Card.Header>
							<Card.Content class="space-y-3">
								{#each p.instruments as i (i.name)}<InstrumentSkill {...i} />{/each}
							</Card.Content>
						</Card.Root>
					{/if}

					{#if p.media.length > 0}
						<Card.Root>
							<Card.Header>
								<Card.Title
									><h2 class="flex items-center gap-2">
										<Music class="size-5" aria-hidden="true" /> Démos et médias
									</h2></Card.Title
								>
							</Card.Header>
							<Card.Content class="grid gap-4 sm:grid-cols-2">
								{#each p.media as m (m.id)}
									<div class="space-y-2 rounded-xl border p-3">
										<MediaPlayer media={m} />
										<p class="text-sm font-medium">
											<a href="/medias/{m.id}" class="hover:underline">{m.title}</a>
											{#if m.isDemo}<Badge variant="secondary" class="ml-1">Démo</Badge>{/if}
										</p>
									</div>
								{/each}
							</Card.Content>
						</Card.Root>
					{/if}
				</div>

				<div class="space-y-6">
					<Card.Root>
						<Card.Header>
							<Card.Title><h2>Ce que d'autres confirment</h2></Card.Title>
							<Card.Description>La réputation : des faits, pas un score.</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-3 text-sm">
							{#if p.confirmed.appreciations.length > 0}
								<div class="space-y-2">
									<p class="font-medium">Apprécié·e après avoir joué ensemble</p>
									<ul class="flex flex-wrap gap-2" aria-label="Appréciations reçues">
										{#each p.confirmed.appreciations as a (a.label)}
											<li class="rounded-full border px-3 py-1">
												{a.label}{a.count > 1 ? ` × ${a.count}` : ''}
											</li>
										{/each}
									</ul>
								</div>
							{/if}
							{#each confirmed as s (s.text)}
								<p class="flex items-start gap-2">
									<s.icon class="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
									{s.text}
								</p>
							{:else}
								{#if p.confirmed.appreciations.length === 0}
									<p class="text-muted-foreground">
										Rien de confirmé pour l'instant. Les collaborations et les concerts confirmés
										par d'autres apparaîtront ici.
									</p>
								{/if}
							{/each}
						</Card.Content>
					</Card.Root>

					{#if p.genres.length > 0 || p.influences.length > 0}
						<Card.Root>
							<Card.Header><Card.Title><h2>Genres</h2></Card.Title></Card.Header>
							<Card.Content class="space-y-3">
								<div class="flex flex-wrap gap-2">
									{#each p.genres as g (g)}<Badge variant="secondary">{g}</Badge>{/each}
								</div>
								{#if p.influences.length > 0}
									<p class="text-sm text-muted-foreground">
										Influences : {p.influences.join(', ')}
									</p>
								{/if}
							</Card.Content>
						</Card.Root>
					{/if}

					{#if p.bands.length > 0}
						<Card.Root>
							<Card.Header
								><Card.Title
									><h2 class="flex items-center gap-2">
										<Users class="size-5" aria-hidden="true" /> Groupes
									</h2></Card.Title
								></Card.Header
							>
							<Card.Content>
								<ul class="space-y-2 text-sm" aria-label="Groupes de {p.displayName}">
									{#each p.bands as b (b.handle)}
										<li>
											<a href="/@{b.handle}" class="font-semibold hover:underline">{b.name}</a>
											<span class="block text-muted-foreground"
												>{b.title ? `${b.title} · ` : ''}{periodLabel(
													b.startedAt ? new Date(b.startedAt) : null,
													null
												)}</span
											>
										</li>
									{/each}
								</ul>
							</Card.Content>
						</Card.Root>
					{/if}

					{#if p.lookingFor.length > 0}
						<Card.Root>
							<Card.Header
								><Card.Title
									><h2 class="flex items-center gap-2">
										<CalendarCheck class="size-5" aria-hidden="true" /> Cherche
									</h2></Card.Title
								></Card.Header
							>
							<Card.Content class="flex flex-wrap gap-2">
								{#each p.lookingFor as l (l)}<Badge variant="outline">{LOOKING_FOR_LABELS[l]}</Badge
									>{/each}
							</Card.Content>
						</Card.Root>
					{/if}

					{#if p.achievements.length > 0}
						<Card.Root>
							<Card.Header><Card.Title><h2>Succès</h2></Card.Title></Card.Header>
							<Card.Content class="space-y-3">
								{#each p.achievements as a (a.id)}<AchievementBadge {...a} />{/each}
							</Card.Content>
						</Card.Root>
					{/if}

					{#if p.links.length > 0}
						<Card.Root>
							<Card.Header
								><Card.Title
									><h2 class="flex items-center gap-2">
										<Link2 class="size-5" aria-hidden="true" /> Liens
									</h2></Card.Title
								></Card.Header
							>
							<Card.Content>
								<ul class="space-y-1 text-sm">
									{#each p.links as l (l.kind)}
										<li>
											<a
												href={l.url}
												rel="me nofollow noopener ugc"
												target="_blank"
												class="underline">{LINK_INFO[l.kind].label}</a
											>
										</li>
									{/each}
								</ul>
							</Card.Content>
						</Card.Root>
					{/if}

					{#if data.canReport}
						<details class="rounded-lg border p-3 text-sm">
							<summary class="cursor-pointer text-muted-foreground">Signaler ce profil</summary>
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
						<details class="rounded-lg border p-3 text-sm">
							<summary class="cursor-pointer text-muted-foreground">Bloquer {p.displayName}</summary
							>
							<p class="mt-2 text-muted-foreground">
								Vous ne pourrez plus vous écrire ni voir vos profils, dans les deux sens. La
								personne n'est pas prévenue. Tu pourras débloquer depuis tes réglages.
							</p>
							<form method="POST" action="?/block" use:enhance class="mt-2">
								<button
									type="submit"
									class="min-h-11 rounded-md border border-destructive/50 px-3 text-destructive"
									>Bloquer</button
								>
							</form>
						</details>
					{/if}
				</div>
			</div>

			{#if data.suggestions.length > 0}
				<Suggestions
					title={data.isOwner ? 'Des musicien·nes pour toi' : 'Dans le même style'}
					suggestions={data.suggestions}
				/>
			{/if}
		</div>
	</div>
{/if}
