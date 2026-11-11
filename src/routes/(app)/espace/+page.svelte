<script lang="ts">
	// LINKMUSICIAN: écran de carrière (P3-12), page-menu (D50), voir
	// +page.server.ts. Les valeurs viennent toutes du serveur.
	import SEO from '#lib/components/SEO.svelte';
	import * as Card from '#shadcn/card';
	import * as Avatar from '#shadcn/avatar';
	import {
		BookOpen,
		CalendarDays,
		CircleCheck,
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
	import MenuList, { type MenuItem } from '#lib/components/linkmusician/MenuList.svelte';
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

	const items = $derived<MenuItem[]>([
		...(c.toConfirm > 0
			? [
					{
						href: '/espace/a-confirmer',
						icon: CircleCheck,
						title: 'À confirmer',
						text: 'Des collaborations, crédits ou invitations attendent ta réponse.',
						badge: String(c.toConfirm),
						highlight: true
					}
				]
			: []),
		// Coups de pouce (P4-13a) : une marche facile, quand on n'avance plus.
		...(data.nudges > 0
			? [
					{
						href: '/espace/coups-de-pouce',
						icon: HandHelping,
						title: 'Un coup de pouce',
						text: 'Des idées simples, tirées de ton réseau, pour reprendre quand tu veux.',
						badge: plural(data.nudges, 'idée', 'idées')
					}
				]
			: []),
		{
			href: '/espace/carte',
			icon: MapIcon,
			title: 'Ma carte de carrière',
			text: data.act
				? `Acte ${data.act.roman} · ${data.act.name} : ${data.act.trial}`
				: 'Les actes I à III sont franchis : la suite arrive bientôt.',
			badge:
				data.actsPassed > 0
					? `${data.actsPassed} épreuve${data.actsPassed > 1 ? 's' : ''} franchie${data.actsPassed > 1 ? 's' : ''}`
					: 'Acte I'
		},
		{
			href: '/espace/fiche',
			icon: FileText,
			title: 'Ma fiche de carrière',
			text: 'Tes rencontres, tes collaborations et les épreuves franchies.',
			badge: 'À partager'
		},
		{
			href: '/espace/ambition',
			icon: Compass,
			title: 'Mon ambition',
			text: data.ambition
				? AMBITION_INFO[data.ambition].pitch
				: 'Ce que tu vises : on met en avant les bons objectifs. Tu peux en changer.',
			badge: data.ambition ? AMBITION_INFO[data.ambition].label : 'À choisir',
			highlight: data.ambition === null
		},
		{
			href: '/espace/objectifs',
			icon: Sparkles,
			title: 'Mes objectifs',
			text: 'Les trois prochaines étapes atteignables maintenant.',
			badge: `${Math.min(d.questProgress.done + 1, d.questProgress.total)} sur ${d.questProgress.total}`
		},
		{
			href: '/espace/campagnes',
			icon: Music,
			title: 'Campagnes en cours',
			text: 'Chaque morceau est une aventure : son état et ses places libres.',
			badge:
				c.campaigns > 0
					? c.openRoles > 0
						? plural(c.openRoles, 'place libre', 'places libres')
						: plural(c.campaigns, 'morceau', 'morceaux')
					: null
		},
		{
			href: '/espace/equipe',
			icon: UsersRound,
			title: 'Mon équipe',
			text: 'Tes groupes et les personnes avec qui tu joues le plus.',
			badge: c.bands > 0 ? plural(c.bands, 'groupe') : null
		},
		{
			href: '/espace/agenda',
			icon: CalendarDays,
			title: 'Agenda',
			text: 'Jams et collaborations à venir.',
			badge: c.agenda > 0 ? `${c.agenda} à venir` : null
		},
		// Parrainage (P4-13b) : à partir du palier Pilier local.
		...(d.canSponsor
			? [
					{
						href: '/espace/parrainage',
						icon: Handshake,
						title: 'Parrainer',
						text: 'Présente deux personnes de ton réseau qui devraient jouer ensemble.',
						badge: null
					}
				]
			: []),
		{
			href: '/espace/journal',
			icon: BookOpen,
			title: 'Journal de bord',
			text: 'Tes derniers gains, et d’où ils viennent.',
			badge: null
		},
		{
			href: '/espace/progression',
			icon: Trophy,
			title: 'Points, succès et confiance',
			text: 'Tes succès, ton palier de confiance et ce qu’il permet.',
			badge: d.trust.name
		},
		{
			href: '/demarches',
			icon: Scale,
			title: 'Les démarches',
			text: 'Protéger un morceau, être payé·e pour jouer, l’association du groupe.',
			badge: null
		}
	]);
</script>

<SEO title="Mon espace" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<!-- En-tête : identité et progression -->
		<Card.Root class="overflow-hidden pt-0">
			<div class="h-20 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500"></div>
			<Card.Content class="-mt-10 space-y-4">
				<div class="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
					<Avatar.Root class="size-20 border-4 border-background shadow-lg">
						<Avatar.Fallback class="bg-violet-100 text-2xl font-bold text-violet-800"
							>{initialsOf(data.person.displayName)}</Avatar.Fallback
						>
					</Avatar.Root>
					<div class="min-w-0 flex-1">
						<h1 class="lm-title lm-title--sm">Salut {firstName} !</h1>
						<p class="text-sm text-muted-foreground">{subtitle}</p>
					</div>
					{#if d.tier}<TierBadge {...d.tier} />{/if}
				</div>
				<div class="flex items-center gap-4">
					<LevelBadge level={d.level} />
					<div class="flex-1">
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
			</Card.Content>
		</Card.Root>

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

		<MenuList label="Mode carrière" {items} />
	</div>
</div>
