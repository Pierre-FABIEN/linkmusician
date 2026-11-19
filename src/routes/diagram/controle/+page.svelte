<script lang="ts">
	// LINKMUSICIAN: couverture et contrôle (DIAGRAM-02, DIAGRAM-06).
	let { data } = $props();
	const MAX = 50;
	const totals = $derived(
		data.coverage.reduce(
			(a, r) => ({
				p: a.p + r.processes,
				i: a.i + r.implemented,
				d: a.d + r.documented,
				v: a.v + r.verified,
				g: a.g + r.diagrams
			}),
			{ p: 0, i: 0, d: 0, v: 0, g: 0 }
		)
	);
</script>

<div class="space-y-6">
	<header class="space-y-2">
		<p class="lm-kicker text-muted-foreground">Contrôle documentaire</p>
		<h1 class="lm-title lm-title--sm">Couverture et contrôle</h1>
		<p class="max-w-3xl text-sm">
			Calculé sur l’inventaire réel et les références vérifiées par <code>npm run diagram:sync</code
			>. Mesure la documentation, pas la qualité du code : les tests applicatifs restent la preuve.
		</p>
	</header>

	<section class="lm-tile lm-tile--flow space-y-1 p-4 text-sm" aria-labelledby="dg-code">
		<h2 id="dg-code" class="font-semibold">Relecture du code</h2>
		<p>
			{data.code.triggers} déclencheurs (actions et méthodes d’endpoints) : {data.code.inventoried} inventoriés,
			{data.code.outOfScope} hors périmètre justifié,
			<strong
				>{data.code.missing.length} non inventorié{data.code.missing.length > 1 ? 's' : ''}</strong
			>.
		</p>
		{#if data.code.missing.length > 0}<ul class="list-disc pl-5">
				{#each data.code.missing as m (m)}<li><code>{m}</code></li>{/each}
			</ul>{/if}
	</section>

	<section class="space-y-2" aria-labelledby="dg-cov">
		<h2 id="dg-cov" class="text-lg font-semibold">Couverture par domaine</h2>
		<div class="dg-table-wrap">
			<table class="dg-cov">
				<caption class="sr-only">Couverture documentaire par domaine</caption>
				<thead>
					<tr
						><th scope="col">Domaine</th><th scope="col">Inventoriés</th><th scope="col"
							>Implémentés</th
						><th scope="col">Testés</th><th scope="col">Conçus ou prévus</th><th scope="col"
							>Documentés</th
						><th scope="col">Références vérifiées</th><th scope="col">Diagrammes</th></tr
					>
				</thead>
				<tbody>
					{#each data.coverage as r (r.domain)}
						<tr>
							<th scope="row"
								><a class="underline" href="/diagram/domaines/{r.domain}">{r.label}</a></th
							>
							<td>{r.processes}</td><td>{r.implemented}</td><td>{r.tested}</td><td>{r.planned}</td>
							<td>{r.documented} / {r.implemented}</td><td>{r.verified} / {r.documented}</td><td
								>{r.diagrams}</td
							>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr
						><th scope="row">Total</th><td>{totals.p}</td><td>{totals.i}</td><td></td><td></td><td
							>{totals.d} / {totals.i}</td
						><td>{totals.v} / {totals.d}</td><td>{totals.g}</td></tr
					>
				</tfoot>
			</table>
		</div>
	</section>

	<section class="space-y-3" aria-labelledby="dg-ctl">
		<h2 id="dg-ctl" class="text-lg font-semibold">Contrôles</h2>
		{#each data.groups as g (g.kind)}
			<details class="lm-tile lm-tile--flow p-4" open={g.items.length > 0 && g.items.length <= 10}>
				<summary class="cursor-pointer">
					<span class="font-semibold">{g.label}</span>
					<span class="lm-pill ml-2" data-tone={g.items.length === 0 ? 'lime' : 'amber'}
						>{g.items.length === 0 ? 'Aucun' : g.items.length}</span
					>
				</summary>
				{#if g.items.length > 0}
					<ul class="mt-2 space-y-1 text-sm">
						{#each g.items.slice(0, MAX) as item, i (i)}
							<li>
								{#if item.href}<a class="underline" href={item.href}><code>{item.subject}</code></a
									>{:else}<code>{item.subject}</code>{/if}
								— {item.message}
							</li>
						{/each}
					</ul>
					{#if g.items.length > MAX}<p class="mt-2 text-xs opacity-75">
							… et {g.items.length - MAX} autres (voir l’inventaire filtré).
						</p>{/if}
				{/if}
			</details>
		{/each}
	</section>
</div>

<style>
	.dg-table-wrap {
		overflow-x: auto;
		border: 1px solid var(--lm-line);
		border-radius: 0.75rem;
	}
	.dg-cov {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
		font-variant-numeric: tabular-nums;
	}
	.dg-cov th,
	.dg-cov td {
		padding: 0.4rem 0.75rem;
		text-align: right;
		border-top: 1px solid color-mix(in oklch, var(--lm-line) 50%, transparent);
	}
	.dg-cov th:first-child {
		text-align: left;
	}
	.dg-cov thead th {
		font-size: 0.7rem;
		text-transform: uppercase;
		background: color-mix(in oklch, var(--lm-ink) 6%, transparent);
	}
	code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.75rem;
	}
</style>
