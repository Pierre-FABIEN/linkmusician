<script lang="ts">
	// LINKMUSICIAN: entités Prisma (DIAGRAM-02) : navigation inverse vers les processus.
	import { normalizeQuery } from '#lib/diagram/ui';

	let { data } = $props();
	let filter = $state('');
	const shown = $derived(
		data.entities.filter((e) => normalizeQuery(e.name).includes(normalizeQuery(filter)))
	);
</script>

<div class="space-y-4">
	<header class="space-y-2">
		<p class="lm-kicker text-muted-foreground">Modèles Prisma</p>
		<h1 class="lm-title lm-title--sm">Entités</h1>
		<p class="text-sm">
			Chaque entité ouvre la liste des processus, diagrammes et étapes qui la lisent ou l’écrivent.
		</p>
	</header>
	<label class="block max-w-sm text-sm font-semibold">
		Filtrer
		<input
			class="lm-field mt-1 w-full"
			type="search"
			bind:value={filter}
			placeholder="ProjectNeed, Membership…"
		/>
	</label>
	<ul class="dg-ent" role="list">
		{#each shown as e (e.name)}
			<li>
				<a href="/diagram/entites/{encodeURIComponent(e.name)}" class="lm-tile lm-tile--flow">
					<code>{e.name}</code>
					<span class="text-xs opacity-75">{e.processes} processus · {e.diagrams} diagrammes</span>
				</a>
			</li>
		{/each}
	</ul>
</div>

<style>
	.dg-ent {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
		gap: 0.5rem;
	}
	.dg-ent a {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.625rem 0.75rem;
		color: inherit;
		text-decoration: none;
	}
	code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.85rem;
		font-weight: 600;
	}
</style>
