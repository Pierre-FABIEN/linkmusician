<script lang="ts">
	// LINKMUSICIAN: liste de diagrammes en tuiles (DIAGRAM-02).
	import type { DeliveryStatus } from '#lib/diagram/types';
	import StatusBadge from './StatusBadge.svelte';

	let {
		cards,
		empty = 'Aucun diagramme détaillé pour l’instant : les processus ci-dessous sont inventoriés, leur diagramme reste à construire.'
	}: {
		cards: {
			id: string;
			slug: string;
			title: string;
			description: string;
			kindLabel: string;
			status: DeliveryStatus;
			steps: number;
		}[];
		empty?: string;
	} = $props();
</script>

{#if cards.length === 0}
	<p class="lm-note text-sm" data-tone="amber">{empty}</p>
{:else}
	<ul class="dg-cards" role="list">
		{#each cards as c (c.id)}
			<li>
				<a href="/diagram/d/{c.slug}" class="lm-tile lm-tile--flow dg-card">
					<span class="lm-kicker text-muted-foreground">{c.kindLabel} · {c.steps} étapes</span>
					<span class="font-semibold">{c.title}</span>
					<span class="text-sm opacity-85">{c.description}</span>
					<StatusBadge status={c.status} short />
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.dg-cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
		gap: 0.75rem;
	}
	.dg-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.375rem;
		height: 100%;
		padding: 0.875rem;
		color: inherit;
		text-decoration: none;
	}
</style>
