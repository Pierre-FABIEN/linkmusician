<script lang="ts">
	import ProofBadge from '#lib/components/linkmusician/profile/ProofBadge.svelte';
	import ProofLegend from '#lib/components/linkmusician/profile/ProofLegend.svelte';
	// LINKMUSICIAN: profil public `/@handle` (P1-11), d'après la maquette validée
	// `/_lab/profil`. Voir +page.server.ts.
	import Suggestions from '#lib/components/linkmusician/Suggestions.svelte';
	import BandProfile from '#lib/components/linkmusician/BandProfile.svelte';
	import StudioPublic from '#lib/components/linkmusician/studios/StudioPublic.svelte';
	import PromoterOrgPublic from '#lib/components/linkmusician/organizations/PromoterOrgPublic.svelte';
	import WorksCard from '#lib/components/linkmusician/works/WorksCard.svelte';
	import SoundEngineerCard from '#lib/components/linkmusician/crafts/SoundEngineerCard.svelte';
	import ProducerCard from '#lib/components/linkmusician/crafts/ProducerCard.svelte';
	import PromoterCard from '#lib/components/linkmusician/crafts/PromoterCard.svelte';
	import AgentCard from '#lib/components/linkmusician/crafts/AgentCard.svelte';
	import CareerSheetCard from '#lib/components/linkmusician/CareerSheetCard.svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SaveContactButton from '#lib/components/linkmusician/contacts/SaveContactButton.svelte';
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
		// LINKMUSICIAN: confidentialité de mes jams (D81).
		if (form && 'message' in form && form.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});

	// Une personne ; la page d'un groupe (P3-02) passe par `BandProfile`. Les
	// valeurs dérivées ci-dessous ne sont lues que dans la branche « personne ».
	const p = $derived(data.profile!);
	// Fiches des métiers (ONB-12b) : celles qui ont au moins un bloc visible.
	const visibleSheets = $derived(data.trackSheets.filter((s) => s.blocks.length > 0));
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
				text: plural(p.confirmed.verifiedReleases, 'sortie vérifiée', 'sorties vérifiées'),
				verified: true
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
	const latestPassedAct = $derived(data.careerSheet?.actsPassed.slice(-1)[0]);
	const souvenirImage = $derived(
		latestPassedAct ? `/api/carriere/souvenir/${p.handle}/${latestPassedAct}.png` : undefined
	);

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
		representHref={data.representHref ?? null}
	/>
	{#if data.signedIn}
		<!-- LINKMUSICIAN: carnet de contacts (D82), aussi pour une structure. -->
		<div class="mx-auto max-w-5xl space-y-1 px-4 pb-16">
			<SaveContactButton saved={data.saved} name={data.band.displayName} />
		</div>
	{/if}
{:else if data.studio}
	<StudioPublic
		studio={data.studio}
		canReport={data.canReport}
		memberShell={Boolean(data.memberShell)}
	/>
	{#if data.signedIn}
		<!-- LINKMUSICIAN: carnet de contacts (D82), aussi pour une structure. -->
		<div class="mx-auto max-w-5xl space-y-1 px-4 pb-16">
			<SaveContactButton saved={data.saved} name={data.studio.name} />
		</div>
	{/if}
{:else if data.promoterOrg}
	<PromoterOrgPublic
		org={data.promoterOrg}
		canReport={data.canReport}
		memberShell={Boolean(data.memberShell)}
	/>
	{#if data.signedIn}
		<!-- LINKMUSICIAN: carnet de contacts (D82), aussi pour une structure. -->
		<div class="mx-auto max-w-5xl space-y-1 px-4 pb-16">
			<SaveContactButton saved={data.saved} name={data.promoterOrg.name} />
		</div>
	{/if}
{:else}
	<SEO
		title="{p.displayName} (@{p.handle})"
		{description}
		{url}
		image={souvenirImage}
		noindex={!p.indexable}
	/>
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
							class="h-32 bg-muted bg-[radial-gradient(circle_at_20%_30%,var(--tone-rose),transparent_50%),radial-gradient(circle_at_80%_60%,var(--tone-violet),transparent_55%)]"
						></div>
						<Card.Content class="-mt-12 space-y-4">
							<div
								class="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4"
							>
								<Avatar.Root class="size-24 border-4 border-background shadow-xl">
									<Avatar.Fallback class="bg-primary/15 text-3xl font-bold text-foreground"
										>{initialsOf(p.displayName)}</Avatar.Fallback
									>
								</Avatar.Root>
								<div class="min-w-0 flex-1">
									<h1 class="lm-title">{p.displayName}</h1>
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
								<div class="flex flex-wrap items-center gap-2">
									<a href="/messages/nouveau?a={p.handle}" class="lm-btn gap-2">
										<MessageCircle class="size-4" aria-hidden="true" /> Écrire à {p.displayName}
									</a>
									{#if data.signedIn}
										<SaveContactButton saved={data.saved} name={p.displayName} />
									{/if}
								</div>
							{:else if !data.isOwner}
								<a href="/auth/login" class="inline-block text-sm underline"
									>Connecte-toi pour écrire à {p.displayName}</a
								>
							{/if}
							{#if data.representHref}
								<!-- LINKMUSICIAN: manager, booker (P5-07). -->
								<a href={data.representHref} class="block text-sm font-semibold underline"
									>Proposer d’accompagner {p.displayName}</a
								>
							{/if}
						</Card.Content>
					</Card.Root>

					{#if p.instruments.length > 0}
						<Card.Root>
							<Card.Header
								><Card.Title
									><h2 class="flex items-center gap-2">
										Instruments <ProofBadge level="DECLARED" />
									</h2></Card.Title
								></Card.Header
							>
							<Card.Content class="space-y-3">
								{#each p.instruments as i (i.name)}<InstrumentSkill {...i} />{/each}
							</Card.Content>
						</Card.Root>
					{/if}

					{#if p.soundEngineer}<SoundEngineerCard profile={p.soundEngineer} />{/if}
					{#if p.producer}<ProducerCard profile={p.producer} />{/if}
					{#if p.promoter}<PromoterCard profile={p.promoter} />{/if}
					{#if p.agent}<AgentCard profile={p.agent} />{/if}
					{#if data.studios.length > 0}
						<!-- Studios publiés que la personne gère (P4-03a). -->
						<Card.Root>
							<Card.Header>
								<Card.Title><h2>Studio</h2></Card.Title>
							</Card.Header>
							<Card.Content>
								<ul class="space-y-1">
									{#each data.studios as studio (studio.handle)}
										<li>
											<a href="/@{studio.handle}" class="font-medium underline">{studio.name}</a>
										</li>
									{/each}
								</ul>
							</Card.Content>
						</Card.Root>
					{/if}

					<WorksCard works={p.works} signedIn={data.signedIn} />

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
									<div class="lm-tile lm-tile--flow space-y-2 p-3">
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
					{#if data.careerSheet}
						<CareerSheetCard sheet={data.careerSheet} handle={p.handle} shareable />
					{/if}

					<Card.Root>
						<Card.Header>
							<Card.Title
								><h2 class="flex items-center gap-2">
									Ce que d'autres confirment <ProofBadge level="CONFIRMED" />
								</h2></Card.Title
							>
							<Card.Description>La réputation : des faits, pas un score.</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-3 text-sm">
							{#if p.confirmed.appreciations.length > 0}
								<div class="space-y-2">
									<p class="font-medium">Apprécié·e après une jam ou une collaboration</p>
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
									<s.icon
										class="mt-0.5 size-4 shrink-0 lm-tone-icon"
										data-tone="lime"
										aria-hidden="true"
									/>
									{s.text}
									{#if 'verified' in s && s.verified}<ProofBadge level="VERIFIED" />{/if}
								</p>
							{:else}
								{#if p.confirmed.appreciations.length === 0}
									<p class="text-muted-foreground">
										Rien de confirmé pour l'instant. Les collaborations et les concerts confirmés
										par d'autres apparaîtront ici.
									</p>
								{/if}
							{/each}
							<ProofLegend />
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

					<!-- LINKMUSICIAN: fiches des métiers (ONB-12b, D61), blocs filtrés par le serveur. -->
					{#if visibleSheets.length > 0}
						<Card.Root>
							<Card.Header
								><Card.Title
									><h2 class="flex items-center gap-2">
										Métiers <ProofBadge level="DECLARED" />
									</h2></Card.Title
								></Card.Header
							>
							<Card.Content class="space-y-5">
								{#each visibleSheets as sheet (sheet.track)}
									<section class="space-y-2" data-testid="fiche-metier">
										<h3 class="font-semibold">
											{sheet.label}{#if sheet.isPrimary}<span
													class="ml-2 text-sm font-normal text-muted-foreground"
													>métier principal</span
												>{/if}
										</h3>
										{#if sheet.openToRequests === true}<Badge variant="secondary"
												>Ouvert·e aux sollicitations</Badge
											>{:else if sheet.openToRequests === false}<Badge variant="outline"
												>Pas de sollicitations en ce moment</Badge
											>{/if}
										{#each sheet.blocks as block (block.block)}
											<dl class="space-y-1 text-sm" data-bloc={block.block}>
												{#each block.lines as line (line.label)}
													<div>
														<dt class="text-muted-foreground">{line.label}</dt>
														<dd class="flex flex-wrap gap-1">
															{#each line.values as v (v)}<Badge variant="outline">{v}</Badge
																>{/each}
														</dd>
													</div>
												{/each}
											</dl>
										{/each}
									</section>
								{/each}
								<p class="text-xs text-muted-foreground">Déclaré par la personne.</p>
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
						<details class="lm-tile lm-tile--flow p-3 text-sm">
							<summary class="cursor-pointer text-muted-foreground">Signaler ce profil</summary>
							<form method="POST" action="?/report" use:enhance class="mt-3 space-y-3">
								<div class="space-y-1">
									<label for="reason" class="block font-medium">Motif</label>
									<select id="reason" name="reason" required class="lm-field w-full">
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
										class="lm-field w-full"
									></textarea>
								</div>
								<button type="submit" class="lm-btn" data-variant="ghost"
									>Envoyer le signalement</button
								>
							</form>
						</details>
						{#if data.jamSharing}
							<!-- LINKMUSICIAN: confidentialité de mes jams (D81). -->
							<details class="lm-tile lm-tile--flow p-3 text-sm">
								<summary class="cursor-pointer text-muted-foreground"
									>Mes jams et {p.displayName}</summary
								>
								<p class="mt-2 text-muted-foreground">
									{data.jamSharing.excluded
										? 'Tes jams lui sont masquées, quel que soit ton partage.'
										: data.jamSharing.granted
											? 'Autorisé·e à voir tes jams, selon ton partage.'
											: 'Tes jams lui sont visibles seulement si tu les partages avec tous les membres.'}
									<a href="/reglages/confidentialite" class="underline">Mon partage</a>
								</p>
								<div class="mt-2 flex flex-wrap gap-2">
									{#if data.jamSharing.granted}
										<form method="POST" action="?/unshareJams" use:enhance>
											<button class="lm-btn" data-variant="ghost">Retirer l’autorisation</button>
										</form>
									{:else if !data.jamSharing.excluded}
										<form method="POST" action="?/shareJams" use:enhance>
											<button class="lm-btn" data-variant="ghost">Autoriser à voir mes jams</button>
										</form>
									{/if}
									{#if data.jamSharing.excluded}
										<form method="POST" action="?/unhideJams" use:enhance>
											<button class="lm-btn" data-variant="ghost">Ne plus masquer</button>
										</form>
									{:else}
										<form method="POST" action="?/hideJams" use:enhance>
											<button class="lm-btn" data-variant="ghost">Masquer mes jams</button>
										</form>
									{/if}
								</div>
							</details>
						{/if}
						<details class="lm-tile lm-tile--flow p-3 text-sm">
							<summary class="cursor-pointer text-muted-foreground">Bloquer {p.displayName}</summary
							>
							<p class="mt-2 text-muted-foreground">
								Vous ne pourrez plus vous écrire ni voir vos profils, dans les deux sens. La
								personne n'est pas prévenue. Tu pourras débloquer depuis tes réglages.
							</p>
							<form method="POST" action="?/block" use:enhance class="mt-2">
								<button type="submit" class="lm-btn" data-variant="danger">Bloquer</button>
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
