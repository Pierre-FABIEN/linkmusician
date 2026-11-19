<script lang="ts">
	// LINKMUSICIAN: liste de processus de l'inventaire (DIAGRAM-02).
	import type { DeliveryStatus } from '#lib/diagram/types';
	import StatusBadge from './StatusBadge.svelte';

	interface Row {
		id: string;
		title: string;
		domain: string;
		actors: string[];
		status: DeliveryStatus;
		trigger: string;
		documented: boolean;
	}

	let {
		rows,
		actors,
		domains,
		caption
	}: {
		rows: Row[];
		actors: Record<string, string>;
		domains?: Record<string, string>;
		caption: string;
	} = $props();
</script>

<div class="dg-table-wrap">
	<table class="dg-table">
		<caption class="sr-only">{caption}</caption>
		<thead>
			<tr>
				<th scope="col">Processus</th>
				{#if domains}<th scope="col">Domaine</th>{/if}
				<th scope="col">Acteurs</th>
				<th scope="col">Statut</th>
				<th scope="col">Diagramme</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.id)}
				<tr>
					<td>
						<a
							class="font-medium underline-offset-2 hover:underline"
							href="/diagram/processus/{encodeURIComponent(row.id)}">{row.title}</a
						>
						<span class="dg-mono">{row.trigger}</span>
					</td>
					{#if domains}<td>{domains[row.domain] ?? row.domain}</td>{/if}
					<td>{row.actors.map((a) => actors[a] ?? a).join(', ')}</td>
					<td><StatusBadge status={row.status} short /></td>
					<td>{row.documented ? 'Oui' : 'À construire'}</td>
				</tr>
			{:else}
				<tr><td colspan={domains ? 5 : 4}>Aucun processus.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.dg-table-wrap {
		overflow-x: auto;
		border: 1px solid var(--lm-line);
		border-radius: 0.75rem;
	}
	.dg-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	.dg-table th {
		text-align: left;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.5rem 0.75rem;
		background: color-mix(in oklch, var(--lm-ink) 6%, transparent);
	}
	.dg-table td {
		vertical-align: top;
		padding: 0.5rem 0.75rem;
		border-top: 1px solid color-mix(in oklch, var(--lm-line) 50%, transparent);
	}
	.dg-mono {
		display: block;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.72rem;
		opacity: 0.7;
		word-break: break-all;
	}
</style>
