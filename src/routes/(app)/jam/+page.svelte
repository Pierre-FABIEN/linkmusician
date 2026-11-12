<script lang="ts">
	// LINKMUSICIAN: accueil du mode jam, page-menu (D50), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import NextStep from '#lib/components/linkmusician/NextStep.svelte';
	import MenuList, { type MenuItem } from '#lib/components/linkmusician/MenuList.svelte';
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

	const items = $derived<MenuItem[]>([
		// Mis en avant en tête : apprécier les gens croisés en jam (P2-15).
		{
			href: '/jam/apprecier',
			icon: Heart,
			title: 'Apprécier les musicos croisés',
			text:
				data.crossedCount > 0
					? 'Dans ta jam en cours ou celles de la semaine : dis ce que tu as aimé.'
					: 'Pendant une jam et la semaine d’après, dis ce que tu as aimé chez les autres.',
			badge: data.appreciate,
			highlight: data.appreciate !== null
		},
		{
			href: '/jam/dispos',
			icon: Radio,
			title: 'Les musicos dispo autour de moi',
			text: data.canBeDispo
				? 'Qui a envie de jouer, et dis-le si c’est ton cas.'
				: 'Les musicien·nes qui ont envie de jouer près de chez toi.',
			badge: data.mySlot
				? `Tu es dispo ${SLOT_LABELS[data.mySlot].toLowerCase()}`
				: data.availableCount > 0
					? plural(data.availableCount, 'dispo', 'dispos')
					: null
		},
		{
			href: '/jam/agenda',
			icon: CalendarDays,
			title: 'Jams à venir',
			text: 'Le calendrier des jams autour de toi, et les lieux où l’on joue.',
			badge: data.jamCount > 0 ? plural(data.jamCount, 'jam', 'jams') : null
		},
		{
			href: '/jam/mes-jams',
			icon: Music,
			title: 'Mes jams',
			text: 'Les jams où l’on t’invite, celles où tu es allé·e.',
			badge:
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
						title: 'Lancer une jam',
						text: 'Choisis un lieu, une date, les places par instrument.'
					}
				]
			: []),
		{
			href: '/jam/carnet',
			icon: BookUser,
			title: 'Mon carnet et mon réseau',
			text: 'Tes souvenirs de jam et les gens avec qui tu as joué.'
		}
	]);
</script>

<SEO title="Mode jam" noindex nofollow />

<div class="min-h-screen w-full bg-muted/20 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<header class="space-y-2">
			<p class="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-primary">
				<Guitar class="size-5" aria-hidden="true" /> Mode jam
			</p>
			<h1 class="text-3xl font-black tracking-tight sm:text-4xl">Envie de jouer ?</h1>
			{#if data.commune}
				<p class="inline-flex items-center gap-2 text-sm text-muted-foreground">
					<MapPin class="size-4" aria-hidden="true" /> Autour de {data.commune}
				</p>
			{/if}
		</header>
		<NextStep {...data.nextStep} tone="jam" />
		<MenuList label="Mode jam" {items} />
	</div>
</div>
