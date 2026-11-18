<script lang="ts">
	// LINKMUSICIAN: écran de carrière (P3-12), page-menu (D50) en panorama
	// Metro (MET-02, D55), voir +page.server.ts. Les valeurs viennent toutes du
	// serveur.
	import PriorityActions from '#lib/components/linkmusician/metro/PriorityActions.svelte';
	import RoleSpace from '#lib/components/linkmusician/RoleSpace.svelte';
	import SEO from '#lib/components/SEO.svelte';
	import * as Avatar from '#shadcn/avatar';
	import {
		BookOpen,
		Briefcase,
		CalendarDays,
		Compass,
		EyeOff,
		FileText,
		HandHelping,
		Handshake,
		Map as MapIcon,
		Music,
		Scale,
		Sparkles,
		Trophy,
		UsersRound
	} from 'lucide-svelte';
	import { plural } from '#lib/jam/log';
	import XpBar from '#lib/components/linkmusician/progress/XpBar.svelte';
	import LevelBadge from '#lib/components/linkmusician/progress/LevelBadge.svelte';
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
	import NextStep from '#lib/components/linkmusician/NextStep.svelte';
	import MetroHome, { type MetroPivot } from '#lib/components/linkmusician/metro/MetroHome.svelte';
	import type { MetroMenuItem } from '#lib/components/linkmusician/metro/MetroMenu.svelte';
	import { TONE_OF } from '#lib/components/linkmusician/metro/tones';
	import { TRACKS } from '#lib/actors/tracks';
	import { initialsOf } from '#lib/actors/display';
	import { AMBITION_INFO } from '#lib/career/ambition';

	let { data } = $props();
	const d = $derived(data.dashboard);
	const c = $derived(data.counts);
	const primary = $derived(data.person.tracks.find((t) => t.isPrimary) ?? data.person.tracks[0]);
	const subtitle = $derived(
		[`@${data.person.handle}`, primary ? TRACKS[primary.track].label : null, data.commune]
			.filter(Boolean)
			.join(' · ')
	);
	const firstName = $derived(data.person.displayName.split(' ')[0]);
	const only = (items: (MetroMenuItem | false)[]) =>
		items.filter((i): i is MetroMenuItem => i !== false);

	// Quatre pivots : avancer (le héros et ce qui attend), le parcours, le
	// réseau, les repères. Un ton par sens (D55, `docs/design` §4.2).
	const pivots = $derived<MetroPivot[]>([
		{
			id: 'avancer',
			title: 'avancer',
			items: only([
				{
					href: '/espace/objectifs',
					icon: Sparkles,
					tone: TONE_OF.goals,
					title: 'Mes objectifs',
					text: 'Les trois prochaines étapes atteignables maintenant.',
					summary: `${Math.min(d.questProgress.done + 1, d.questProgress.total)} sur ${d.questProgress.total}`
				},
				{
					href: '/espace/ambition',
					icon: Compass,
					title: 'Mon ambition',
					text: data.ambition
						? AMBITION_INFO[data.ambition].pitch
						: 'Ce que tu vises : on met en avant les bons objectifs. Tu peux en changer.',
					summary: data.ambition ? AMBITION_INFO[data.ambition].label : 'À choisir',
					highlight: data.ambition === null
				},
				// Coups de pouce (P4-13a) : une marche facile, quand on n'avance plus.
				data.nudges > 0 && {
					href: '/espace/coups-de-pouce',
					icon: HandHelping,
					title: 'Un coup de pouce',
					text: 'Des idées simples, tirées de ton réseau, pour reprendre quand tu veux.',
					summary: plural(data.nudges, 'idée', 'idées')
				}
			])
		},
		{
			id: 'parcours',
			title: 'parcours',
			items: [
				{
					href: '/espace/carte',
					icon: MapIcon,
					tone: TONE_OF.career,
					title: 'Ma carte de carrière',
					text: data.withinReach[0]
						? `À portée · ${data.withinReach[0].name} : ${data.withinReach[0].reason}`
						: 'Tes branches avancent chacune à son rythme, dans l’ordre que tu veux.',
					summary:
						data.withinReach.length > 0
							? `${data.withinReach.length} à portée`
							: data.actsPassed > 0
								? `${data.actsPassed} épreuve${data.actsPassed > 1 ? 's' : ''} franchie${data.actsPassed > 1 ? 's' : ''}`
								: 'En branches'
				},
				{
					href: '/espace/campagnes',
					icon: Music,
					tone: TONE_OF.works,
					title: 'Campagnes en cours',
					text: 'Chaque morceau est une aventure : son état et ses places libres.',
					summary:
						c.campaigns > 0
							? c.openRoles > 0
								? plural(c.openRoles, 'place libre', 'places libres')
								: plural(c.campaigns, 'morceau', 'morceaux')
							: null
				},
				{
					href: '/espace/agenda',
					icon: CalendarDays,
					tone: TONE_OF.agenda,
					title: 'Agenda',
					text: 'Jams et collaborations à venir.'
				},
				{
					href: '/espace/fiche',
					icon: FileText,
					title: 'Ma fiche de carrière',
					text: 'Tes rencontres, tes collaborations et les épreuves franchies.',
					summary: 'À partager'
				}
			]
		},
		{
			id: 'reseau',
			title: 'réseau',
			items: only([
				{
					href: '/structure',
					title: 'Mes structures',
					text: 'Mes participations et mes invitations, communes à mes métiers.',
					icon: Briefcase
				},
				{
					href: '/espace/equipe',
					icon: UsersRound,
					tone: TONE_OF.people,
					title: 'Mon équipe',
					text: 'Tes groupes et les personnes avec qui tu joues le plus.',
					summary: c.bands > 0 ? plural(c.bands, 'groupe') : null
				},
				// Accompagnement (P5-07) : managers, bookers, et les artistes accompagnés.
				!!data.representation && {
					href: '/accompagnement',
					icon: Briefcase,
					tone: TONE_OF.people,
					title: 'Accompagnement',
					text: data.representation.isAgent
						? 'Les artistes que tu accompagnes, comme manager ou booker.'
						: 'Les managers et bookers qui t’accompagnent.',
					summary:
						data.representation.pending > 0
							? `${data.representation.pending} à trancher`
							: data.representation.current > 0
								? plural(data.representation.current, 'en cours', 'en cours')
								: null,
					highlight: data.representation.pending > 0
				},
				// Parrainage (P4-13b) : à partir du palier Pilier local.
				d.canSponsor && {
					href: '/espace/parrainage',
					icon: Handshake,
					tone: TONE_OF.people,
					title: 'Parrainer',
					text: 'Présente deux personnes de ton réseau qui devraient jouer ensemble.'
				}
			])
		},
		{
			id: 'reperes',
			title: 'repères',
			items: [
				{
					href: '/espace/progression',
					icon: Trophy,
					tone: TONE_OF.progress,
					title: 'Points, succès et confiance',
					text: 'Tes succès, ton palier de confiance et ce qu’il permet.',
					summary: d.trust.name
				},
				{
					href: '/espace/journal',
					icon: BookOpen,
					tone: TONE_OF.figures,
					title: 'Journal de bord',
					text: 'Tes derniers gains, et d’où ils viennent.'
				},
				{
					href: '/demarches',
					icon: Scale,
					title: 'Les démarches',
					text: 'Protéger un morceau, être payé·e pour jouer, l’association du groupe.'
				}
			]
		}
	]);
</script>

<SEO title="Mon espace" noindex nofollow />

{#if data.roleSpace}
	<RoleSpace {...data.roleSpace} priorities={data.priorities} />
{:else}
	<MetroHome label="Mode carrière" {pivots}>
		{#snippet priorities()}<PriorityActions actions={data.priorities} />{/snippet}
		{#snippet header()}
			<!-- En-tête : identité et progression -->
			<header class="flex max-w-3xl flex-col gap-4">
				<div class="flex items-center gap-4">
					<Avatar.Root class="size-16 shrink-0 shadow-lg">
						<Avatar.Fallback class="bg-primary/15 text-xl font-bold text-foreground"
							>{initialsOf(data.person.displayName)}</Avatar.Fallback
						>
					</Avatar.Root>
					<div class="min-w-0 space-y-1">
						<p class="lm-kicker flex items-center gap-2 text-muted-foreground">
							<Trophy class="size-4" aria-hidden="true" /> Mode carrière
						</p>
						<h1 class="lm-title">Salut {firstName} !</h1>
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
					<p class="text-sm text-muted-foreground">{subtitle}</p>
					{#if d.tier}<TierBadge {...d.tier} />{/if}
				</div>
				<div class="flex items-center gap-4">
					<LevelBadge level={d.level} />
					<div class="max-w-md flex-1">
						<XpBar
							level={d.level}
							xp={d.xp}
							xpIntoLevel={d.xpIntoLevel}
							xpForNextLevel={d.xpForNextLevel}
						/>
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
					{#if data.hidden}
						<span class="flex items-center gap-1 text-muted-foreground"
							><EyeOff class="size-4" aria-hidden="true" /> Profil public masqué</span
						>
					{:else}
						<a href="/@{data.person.handle}" class="underline">Voir mon profil public</a>
					{/if}
					<a href="/profil" class="underline">Mon profil</a>
				</div>
			</header>
		{/snippet}
		{#snippet hero()}
			{#if d.objectives[0]}
				{@const o = d.objectives[0]}
				<NextStep
					index={Math.min(d.questProgress.done + 1, d.questProgress.total)}
					total={d.questProgress.total}
					title={o.label}
					text={o.xp
						? `Une étape réelle de ta carrière : environ ${o.xp} XP à la clé.`
						: 'Une étape réelle de ta carrière, à franchir avec d’autres.'}
					href={o.href ?? '/annonces'}
					cta={o.href ? 'J’y vais' : 'Bientôt disponible'}
				/>
			{/if}
		{/snippet}
	</MetroHome>
{/if}
