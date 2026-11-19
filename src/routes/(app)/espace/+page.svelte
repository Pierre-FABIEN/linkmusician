<script lang="ts">
	// LINKMUSICIAN: accueil Collab (P3-12, D50 ; Metro MET-02, D55 ; U0, D74),
	// voir +page.server.ts. Quatre pivots : avancer (le héros, ce qui attend,
	// le travail en cours), ma musique, réseau, repères. Les valeurs viennent
	// toutes du serveur ; aucune entrée ne mène à un écran qui n'existe pas.
	import RoleSpace from '#lib/components/linkmusician/RoleSpace.svelte';
	import CollabAdvance from '#lib/components/linkmusician/metro/CollabAdvance.svelte';
	import SEO from '#lib/components/SEO.svelte';
	import * as Avatar from '#shadcn/avatar';
	import {
		BadgeCheck,
		BookOpen,
		Briefcase,
		Compass,
		EyeOff,
		FileText,
		HandHelping,
		Handshake,
		Map as MapIcon,
		Megaphone,
		Music,
		Scale,
		Search,
		SlidersHorizontal,
		Sparkles,
		Target,
		Trophy,
		UsersRound
	} from 'lucide-svelte';
	import { plural } from '#lib/jam/log';
	import XpBar from '#lib/components/linkmusician/progress/XpBar.svelte';
	import LevelBadge from '#lib/components/linkmusician/progress/LevelBadge.svelte';
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
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

	// Quatre pivots (conception 20 §4.2). Trois tons vifs au plus dans
	// « avancer » : violet (héros), bleu (travail), et les tuiles en papier.
	const pivots = $derived<MetroPivot[]>([
		{
			id: 'avancer',
			title: 'avancer',
			// U2 : « Travaux en cours » devient « Hors projet », dans « Mes projets »
			// (`ProjectsHome`, sous le héros), commun à tous les métiers.
			items: []
		},
		{
			id: 'ma-musique',
			title: 'ma musique',
			items: [
				{
					href: '/morceaux',
					icon: Music,
					title: 'Mes morceaux',
					text: 'Ce que tu portes, seul·e ou avec ton groupe, et tes crédits.'
				},
				// U1 : ce que j'ai réalisé et qui le confirme (crédits, collaborations).
				{
					href: '/espace/contributions',
					icon: BadgeCheck,
					title: 'Mes contributions',
					text: 'Ce que tu as réalisé avec d’autres, et qui le confirme.'
				},
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
					icon: UsersRound,
					tone: TONE_OF.people,
					title: 'Mes groupes et structures',
					text: 'Tes groupes, studios, lieux, agences et écoles, communs à tes métiers.',
					summary: c.bands > 0 ? plural(c.bands, 'groupe') : null
				},
				{
					href: '/messages/contacts',
					icon: Handshake,
					title: 'Mes contacts',
					text: 'Les personnes que tu as gardées, sans échanger ton numéro.'
				},
				{
					href: '/decouvrir',
					icon: Search,
					title: 'Trouver quelqu’un',
					text: 'Musicien·nes, ingés son, producteur·rices près de chez toi.'
				},
				{
					href: '/annonces',
					icon: Megaphone,
					title: 'Annonces et candidatures',
					text: 'Publier une annonce, répondre, suivre tes candidatures.'
				},
				// Accompagnement (P5-07) : managers, bookers, et les artistes accompagnés.
				!!data.representation && {
					href: '/accompagnement',
					icon: Briefcase,
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
			items: only([
				// UX-1 (D74) : l'objectif passe ici quand le héros montre une action.
				!!data.step && {
					href: data.step.href,
					icon: Target,
					tone: TONE_OF.nextStep,
					title: `Ta prochaine étape : ${data.step.title}`,
					text: data.step.text,
					summary: `${data.step.index} sur ${data.step.total}`
				},
				{
					href: '/espace/objectifs',
					icon: Sparkles,
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
				},
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
					href: '/espace/propositions',
					icon: SlidersHorizontal,
					title: 'Ce que Melokiva me propose',
					text: 'Les suggestions que tu as écartées ou reportées.'
				},
				{
					href: '/demarches',
					icon: Scale,
					title: 'Les démarches',
					text: 'Protéger un morceau, être payé·e pour jouer, l’association du groupe.'
				}
			])
		}
	]);
</script>

<SEO title="Mon espace" noindex nofollow />

{#if data.roleSpace}
	<RoleSpace {...data.roleSpace} priorities={data.priorities} advance={data.advance} />
{:else}
	<MetroHome label="Collab" {pivots}>
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
							<Trophy class="size-4" aria-hidden="true" /> Collab
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
			<CollabAdvance {...data.advance} priorities={data.priorities} />
		{/snippet}
	</MetroHome>
{/if}
