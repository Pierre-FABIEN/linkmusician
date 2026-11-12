<script lang="ts">
	/** DASH-01 : menu du métier actif, basé uniquement sur les écrans livrés. */
	import { Briefcase, CircleCheck, FileText, Sparkles, Trophy } from 'lucide-svelte';
	import MetroHome from './metro/MetroHome.svelte';
	import TierBadge from './progress/TierBadge.svelte';
	import type { RoleMenuEntry } from '#lib/linkmusician/navigation';

	let {
		title,
		available,
		entries,
		tier,
		pending = 0
	}: {
		title: string;
		available: boolean;
		entries: RoleMenuEntry[];
		tier: { id: string; label: string } | null;
		pending?: number;
	} = $props();
	const pivots = $derived([
		{
			id: 'activite',
			title: 'activité',
			items: [
				...(available && pending > 0
					? [
							{
								href: '/espace/a-confirmer',
								title: 'À confirmer',
								text: 'Des collaborations, crédits ou invitations attendent ta réponse.',
								icon: CircleCheck,
								summary: String(pending),
								highlight: true
							}
						]
					: []),
				...entries.map((entry) => ({
					...entry,
					icon: entry.href === '/espace/objectifs' ? Sparkles : Briefcase
				}))
			]
		},
		{
			id: 'reperes',
			title: 'repères',
			items: [
				{
					href: '/espace/progression',
					title: 'Points, succès et confiance',
					text: 'La progression commune de ton compte.',
					icon: Trophy
				},
				{
					href: '/profil',
					title: 'Mon profil complet',
					text: 'Tes informations communes et toutes tes fiches métier.',
					icon: FileText
				}
			]
		}
	]);
</script>

<MetroHome label="Espace {title}" {pivots}>
	{#snippet header()}
		<header class="max-w-3xl space-y-3">
			<p class="lm-kicker text-muted-foreground">Mon espace</p>
			<h1 class="lm-title">{title}</h1>
			{#if tier}<TierBadge {...tier} />{/if}
			<p class="text-muted-foreground">
				{available
					? 'Tes outils pour ce métier. Change de contexte avec le sélecteur Mon espace, en haut.'
					: 'Ce parcours métier arrive bientôt. Tu peux déjà compléter ta fiche ; ses fonctions professionnelles ne sont pas encore ouvertes.'}
			</p>
		</header>
	{/snippet}
</MetroHome>
