<script lang="ts" module>
	import type { ProjectTileData } from './ProjectTile.svelte';

	/** « Mes projets » dans l'accueil Collab, calculé par le serveur (U2). */
	export type CollabProjects = {
		/** Trois projets au plus en tout, héros compris (conception 20 §6.1). */
		tiles: ProjectTileData[];
		active: number;
		/** Morceaux que je gère hors de tout projet ; `null` : pas d'entrée. */
		outside: number | null;
	};
</script>

<script lang="ts">
	/**
	 * LINKMUSICIAN: « Mes projets » dans le pivot « avancer » (U2 ; conception 20
	 * §4.2 et §6.1), commun à tous les métiers : l'entrée « Mes projets », au
	 * plus trois projets, « Créer un projet », et « Hors projet » quand j'ai
	 * des morceaux. Une action claire par tuile ; un compte sans projet garde
	 * tout ce qu'il voyait, avec une porte de plus, facultative.
	 */
	import { FolderOpen, FolderPlus, Music } from 'lucide-svelte';
	import MetroMenu, { type MetroMenuItem } from '../metro/MetroMenu.svelte';
	import { TONE_OF } from '../metro/tones';
	import ProjectTile from './ProjectTile.svelte';
	import { plural } from '#lib/jam/log';

	let { projects }: { projects: CollabProjects } = $props();

	const head = $derived<MetroMenuItem[]>([
		{
			href: '/projets',
			icon: FolderOpen,
			tone: TONE_OF.works,
			title: 'Mes projets',
			text: 'Ce que tu prépares, construis et réalises.',
			summary: projects.active > 0 ? plural(projects.active, 'en cours', 'en cours') : null
		}
	]);
	const tail = $derived<MetroMenuItem[]>([
		{
			href: '/projets/nouveau',
			icon: FolderPlus,
			title: 'Créer un projet',
			text: 'Un EP, une tournée : un nom et un type suffisent, sans groupe.'
		},
		...(projects.outside === null
			? []
			: [
					{
						href: '/espace/campagnes',
						icon: Music,
						title: 'Hors projet',
						text: 'Tes morceaux rangés dans aucun projet, et leurs places libres.',
						summary:
							projects.outside > 0
								? plural(projects.outside, 'morceau', 'morceaux')
								: 'Tout est rangé'
					}
				])
	]);
</script>

<section aria-label="Mes projets" class="space-y-3" data-testid="home-projects">
	<MetroMenu items={head} />
	{#if projects.tiles.length > 0}
		<ul class="lm-menu" aria-label="Projets en cours">
			{#each projects.tiles as project, i (project.id)}
				<li class="grid"><ProjectTile {project} index={i + 1} /></li>
			{/each}
		</ul>
	{/if}
	<MetroMenu items={tail} />
</section>
