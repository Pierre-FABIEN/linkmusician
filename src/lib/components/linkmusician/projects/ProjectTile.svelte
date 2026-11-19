<script lang="ts" module>
	/** Ce qu'une tuile de projet affiche : un extrait de `ProjectSummary`
	 * (`#server/projects/overview`), déjà filtré par le serveur. */
	export type ProjectTileData = {
		id: string;
		name: string;
		kindLabel: string;
		statusLabel: string;
		status: 'ACTIVE' | 'DONE' | 'ABANDONED';
		owner: { name: string; isMe: boolean };
		roleLabel: string;
		progress: string;
		nextAction: { label: string };
	};
</script>

<script lang="ts">
	/**
	 * LINKMUSICIAN: tuile d'un projet (P3, U2 ; conception 20 §6.1) : nom, nature
	 * et porteur, état, mon rôle, une ligne d'avancement calculée sur ce que je
	 * vois, et la prochaine action. **Un seul geste** : ouvrir la fiche, où la
	 * prochaine action se réalise (jamais une écriture depuis la tuile). Bleu :
	 * le travail (D55). Commune à `/projets`, à l'accueil Collab et aux espaces
	 * métiers (`CollabAdvance`).
	 */
	import { ArrowRight, FolderOpen } from 'lucide-svelte';
	import Tile from '../metro/Tile.svelte';
	import { TONE_OF } from '../metro/tones';

	let { project, index = 0 }: { project: ProjectTileData; index?: number } = $props();
	const active = $derived(project.status === 'ACTIVE');
	const owner = $derived(project.owner.isMe ? 'À moi' : project.owner.name);
</script>

<Tile
	href="/projets/{project.id}"
	tone={active ? TONE_OF.works : 'paper'}
	icon={FolderOpen}
	{index}
	class="lm-project-tile"
	data-testid="project-tile"
>
	<span class="block min-w-0 space-y-1">
		<span class="lm-tile__kicker block wrap-break-word">{project.kindLabel} · {owner}</span>
		<span class="lm-tile__title block wrap-break-word">{project.name}</span>
		<span class="lm-tile__text block wrap-break-word">{project.progress}</span>
		<span class="flex flex-wrap gap-2 pt-1">
			<span class="lm-pill text-xs">{project.statusLabel}</span>
			<span class="lm-pill text-xs">{project.roleLabel}</span>
		</span>
		{#if active}
			<span class="flex items-center gap-1 pt-1 text-sm font-semibold">
				<span class="sr-only">Prochaine action :</span>{project.nextAction.label}<ArrowRight
					class="size-4 shrink-0"
					aria-hidden="true"
				/>
			</span>
		{/if}
	</span>
</Tile>
