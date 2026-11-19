<script lang="ts">
	/**
	 * LINKMUSICIAN: héros « Ton projet en cours » de l'accueil Collab (U2 ; D74,
	 * étape 2 ; conception 20 §6.1) : le projet principal, déduit de ma
	 * dernière action (UX-3, défaut), et sa prochaine action réelle. Un seul
	 * geste : celui de la prochaine action. Ni XP ni pourcentage.
	 */
	import { ArrowRight, FolderOpen } from 'lucide-svelte';
	import Tile from '../metro/Tile.svelte';
	import { toneOfMode } from '../metro/tones';
	import type { ProjectTileData } from './ProjectTile.svelte';

	let {
		project
	}: {
		project: ProjectTileData & { nextAction: { label: string; text: string; href: string } };
	} = $props();
	const owner = $derived(project.owner.isMe ? 'À moi' : project.owner.name);
</script>

<Tile tone={toneOfMode('CAREER')} icon={FolderOpen} class="lm-next-step" data-testid="project-hero">
	<section class="space-y-3" aria-labelledby="project-hero-title">
		<p class="lm-tile__kicker">Ton projet en cours</p>
		<h2 id="project-hero-title" class="lm-title lm-title--sm wrap-break-word">
			<a href="/projets/{project.id}" class="underline-offset-4 hover:underline">{project.name}</a>
		</h2>
		<p class="lm-tile__text wrap-break-word">
			{project.kindLabel} · {owner} · {project.progress}
		</p>
		<p class="lm-tile__text max-w-prose wrap-break-word">{project.nextAction.text}</p>
		<a href={project.nextAction.href} class="lm-btn">
			{project.nextAction.label}
			<ArrowRight class="size-4" aria-hidden="true" />
		</a>
	</section>
</Tile>
