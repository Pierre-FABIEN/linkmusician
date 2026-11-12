<script lang="ts">
	/**
	 * LINKMUSICIAN: contenu Markdown rendu côté serveur (`#lib/server/aide/render`) :
	 * titres, listes, tableaux défilants, encarts (En bref, Astuce, Important,
	 * Bientôt, Dans le projet), questions repliables. Contenu du dépôt
	 * seulement, jamais saisi par un·e utilisateur·rice.
	 */
	let { html }: { html: string } = $props();
</script>

<div class="aide-content">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- contenu du dépôt, rendu côté serveur -->
	{@html html}
</div>

<style>
	.aide-content {
		--aide-tip: oklch(0.75 0.15 75);
		--aide-warning: var(--destructive);
		--aide-soon: oklch(0.6 0.15 250);
		--aide-brief: oklch(0.55 0.2 285);
		--aide-project: oklch(0.62 0.13 160);
		line-height: 1.65;
	}
	.aide-content :global(h2) {
		margin: 2.5rem 0 0.75rem;
		font-size: 1.5rem;
		font-weight: 800;
		line-height: 1.25;
		scroll-margin-top: 1.5rem;
	}
	.aide-content :global(h3) {
		margin: 1.75rem 0 0.5rem;
		font-size: 1.15rem;
		font-weight: 700;
		scroll-margin-top: 1.5rem;
	}
	.aide-content :global(p),
	.aide-content :global(ul),
	.aide-content :global(ol) {
		margin: 0.75rem 0;
	}
	.aide-content :global(ul) {
		list-style: disc;
		padding-left: 1.25rem;
	}
	.aide-content :global(ol) {
		list-style: decimal;
		padding-left: 1.5rem;
	}
	.aide-content :global(li) {
		margin: 0.35rem 0;
	}
	.aide-content :global(a) {
		text-decoration: underline;
		text-underline-offset: 2px;
		font-weight: 500;
	}
	.aide-content :global(strong) {
		font-weight: 700;
	}
	.aide-content :global(code) {
		border-radius: 0.375rem;
		background: var(--muted);
		padding: 0.1rem 0.35rem;
		font-size: 0.9em;
	}
	.aide-content :global(.aide-table) {
		margin: 1rem 0;
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: 1rem;
	}
	.aide-content :global(.aide-table:focus-visible) {
		outline: 3px solid var(--foreground);
		outline-offset: 2px;
	}
	.aide-content :global(table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.925rem;
	}
	.aide-content :global(th) {
		background: var(--muted);
		text-align: left;
		font-weight: 700;
	}
	.aide-content :global(th),
	.aide-content :global(td) {
		padding: 0.6rem 0.8rem;
		vertical-align: top;
		border-bottom: 1px solid var(--border);
	}
	.aide-content :global(tr:last-child td) {
		border-bottom: 0;
	}
	.aide-content :global(.aide-callout) {
		margin: 1.25rem 0;
		border-radius: 1rem;
		border-left: 4px solid var(--aide-color);
		background: color-mix(in oklch, var(--aide-color) 10%, var(--card));
		padding: 0.25rem 1rem;
	}
	.aide-content :global(.aide-brief) {
		--aide-color: var(--aide-brief);
		padding: 0.75rem 1.25rem;
	}
	.aide-content :global(.aide-callout-title) {
		margin-bottom: 0.25rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 0.8rem;
	}
	.aide-content :global(.aide-tip) {
		--aide-color: var(--aide-tip);
	}
	.aide-content :global(.aide-warning) {
		--aide-color: var(--aide-warning);
	}
	.aide-content :global(.aide-soon) {
		--aide-color: var(--aide-soon);
	}
	.aide-content :global(.aide-project) {
		--aide-color: var(--aide-project);
	}
	.aide-content :global(details) {
		margin: 0.5rem 0;
		border: 1px solid var(--border);
		border-radius: 1rem;
		background: var(--card);
		padding: 0 1rem;
	}
	.aide-content :global(summary) {
		display: flex;
		min-height: 2.75rem;
		cursor: pointer;
		align-items: center;
		font-weight: 600;
	}
	.aide-content :global(details[open] summary) {
		border-bottom: 1px solid var(--border);
	}
</style>
