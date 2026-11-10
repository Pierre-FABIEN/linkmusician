<script lang="ts">
	/**
	 * LINKMUSICIAN: panorama horizontal (refonte Metro). Un rail natif à
	 * accroche (`scroll-snap`) : glisser au doigt, flèches du clavier ou onglets.
	 * Le défilement reste local au rail pour ne jamais gêner `smooth-scrollbar`,
	 * qui ne retient que les gestes verticaux. Sans script, tous les volets restent
	 * lisibles ; le script ajoute les onglets, le volet actif et l'entrée des tuiles.
	 */
	import type { Snippet } from 'svelte';

	let { label, children }: { label: string; children: Snippet } = $props();

	let rail = $state<HTMLElement | null>(null);
	let pivots = $state<{ id: string; title: string }[]>([]);
	let active = $state('');
	let ready = $state(false);
	let nodes: HTMLElement[] = [];

	$effect(() => {
		if (!rail) return;
		const railElement = rail;
		nodes = [...railElement.querySelectorAll<HTMLElement>('[data-pivot]')];
		pivots = nodes.map((n) => ({ id: n.id, title: n.dataset.title ?? n.id }));
		active = nodes[0]?.id ?? '';
		ready = true;

		const ratios: Record<string, number> = {};
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					ratios[e.target.id] = e.intersectionRatio;
					if (e.intersectionRatio > 0.35) (e.target as HTMLElement).setAttribute('data-seen', '');
				}
				const style = getComputedStyle(railElement);
				const railRect = railElement.getBoundingClientRect();
				const anchor = railRect.left + (parseFloat(style.paddingLeft) || 0);
				const best = nodes
					.map((node) => {
						const rect = node.getBoundingClientRect();
						return {
							id: node.id,
							ratio: ratios[node.id] ?? 0,
							distance: Math.abs(rect.left - anchor)
						};
					})
					.filter((node) => node.ratio > 0)
					.sort((a, b) => b.ratio - a.ratio || a.distance - b.distance)[0];
				if (best) active = best.id;
			},
			{ root: railElement, threshold: [0, 0.25, 0.5, 0.75, 1] }
		);
		for (const n of nodes) io.observe(n);
		return () => io.disconnect();
	});

	$effect(() => {
		for (const n of nodes) n.toggleAttribute('data-active', n.id === active);
	});

	function go(id: string) {
		const target = nodes.find((n) => n.id === id);
		if (!rail || !target) return;
		active = id;
		const style = getComputedStyle(rail);
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const pad = parseFloat(style.paddingLeft) || 0;
		const left = target.offsetLeft - pad;
		rail.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' });
	}
</script>

<div class="lm-panorama" data-ready={ready || undefined}>
	{#if pivots.length > 1}
		<nav class="lm-panorama__nav" aria-label="Sections de {label}">
			{#each pivots as p (p.id)}
				<button
					type="button"
					aria-current={active === p.id ? 'true' : undefined}
					onclick={() => go(p.id)}>{p.title}</button
				>
			{/each}
		</nav>
	{/if}
	<!-- Zone défilante : focalisable pour que les flèches du clavier la parcourent. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div bind:this={rail} class="lm-rail" role="region" aria-label={label} tabindex="0">
		{@render children()}
	</div>
</div>
