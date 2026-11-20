<script lang="ts">
	// LINKMUSICIAN: accueil du mode jam, page-menu (D50) en panorama Metro
	// (MET-02, D55), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import NextStep from '#lib/components/linkmusician/NextStep.svelte';
	import MetroHome, { type MetroPivot } from '#lib/components/linkmusician/metro/MetroHome.svelte';
	import { TONE_OF } from '#lib/components/linkmusician/metro/tones';
	import { SLOT_LABELS } from '#lib/jam/availability';
	import {
		BookUser,
		CalendarDays,
		GraduationCap,
		Guitar,
		Heart,
		MapPin,
		Music,
		Plus,
		Radio
	} from 'lucide-svelte';

	let { data } = $props();
	const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

	const pivots = $derived<MetroPivot[]>([
		{
			id: 'jouer',
			title: 'jouer',
			items: [
				// Mis en avant en tête : apprécier les gens croisés en jam (P2-15).
				{
					href: '/jam/apprecier',
					icon: Heart,
					tone: TONE_OF.appreciations,
					title: 'Mes jams récentes',
					text:
						data.crossedCount > 0
							? 'Ta jam en cours ou celles de la semaine : dis si tu y étais, pour toi seul·e.'
							: 'Pendant une jam et la semaine d’après, dis si tu y étais. Ça reste privé.',
					summary: data.appreciate,
					highlight: data.appreciate !== null
				},
				{
					href: '/jam/dispos',
					icon: Radio,
					tone: TONE_OF.availability,
					title: 'Les musicos dispo autour de moi',
					text: data.canBeDispo
						? 'Qui a envie de jouer, et dis-le si c’est ton cas.'
						: 'Les musicien·nes qui ont envie de jouer près de chez toi.',
					summary: data.mySlot
						? `Tu es dispo ${SLOT_LABELS[data.mySlot].toLowerCase()}`
						: data.availableCount > 0
							? plural(data.availableCount, 'dispo', 'dispos')
							: null
				}
			]
		},
		{
			id: 'mes-jams',
			title: 'mes jams',
			items: [
				{
					href: '/jam/agenda',
					icon: CalendarDays,
					tone: TONE_OF.agenda,
					title: 'Jams à venir',
					text: 'Le calendrier des jams autour de toi, et les lieux où l’on joue.',
					summary: data.jamCount > 0 ? plural(data.jamCount, 'jam', 'jams') : null
				},
				{
					href: '/jam/mes-jams',
					icon: Music,
					tone: TONE_OF.jam,
					title: 'Mes jams',
					text: 'Les jams où l’on t’invite, celles où tu es allé·e.',
					summary:
						data.inviteCount > 0
							? plural(data.inviteCount, 'invitation', 'invitations')
							: data.recentCount > 0
								? plural(data.recentCount, 'jam récente', 'jams récentes')
								: null,
					highlight: data.inviteCount > 0
				},
				// Écoles (P5-11) : les ateliers réservés aux élèves.
				...(data.schools > 0
					? [
							{
								href: '/ecoles',
								icon: GraduationCap,
								tone: TONE_OF.jam,
								title: data.schools > 1 ? 'Mes écoles' : 'Mon école',
								text: 'Les ateliers jam de ton école, pour jouer avec d’autres avant la scène.'
							}
						]
					: []),
				// Organisateurs seulement (D51) ; les autres s'écrivent pour jouer ensemble.
				...(data.organizer
					? [
							{
								href: '/jams/nouvelle',
								icon: Plus,
								tone: TONE_OF.jam,
								title: 'Lancer une jam',
								text: 'Choisis un lieu, une date, les places par instrument.'
							}
						]
					: [])
			]
		},
		{
			id: 'reseau',
			title: 'réseau',
			items: [
				{
					href: '/jam/carnet',
					icon: BookUser,
					tone: TONE_OF.people,
					title: 'Mon carnet et mon réseau',
					text: 'Tes souvenirs de jam et les gens avec qui tu as joué.'
				}
			]
		}
	]);
</script>

<SEO title="Rencontre" noindex nofollow />

<MetroHome label="Rencontre" {pivots}>
	{#snippet header()}
		<header class="space-y-2">
			<p class="lm-kicker flex items-center gap-2 text-muted-foreground">
				<Guitar class="size-5" aria-hidden="true" /> Rencontre
			</p>
			<h1 class="lm-title">Envie de jouer ?</h1>
			{#if data.commune}
				<p class="inline-flex items-center gap-2 text-sm text-muted-foreground">
					<MapPin class="size-4" aria-hidden="true" /> Autour de {data.commune}
				</p>
			{/if}
		</header>
	{/snippet}
	{#snippet hero()}
		<NextStep {...data.nextStep} tone="jam" />
	{/snippet}
</MetroHome>
