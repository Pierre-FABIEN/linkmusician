<script lang="ts">
	/**
	 * LINKMUSICIAN: célébrations (P2-11). Cartes non bloquantes en bas de
	 * l'écran (au-dessus de la barre d'onglets mobile), qui disparaissent
	 * seules. Tout le contenu vient du serveur ; au premier affichage, le
	 * client renvoie le repère `upTo` reçu (« vu jusqu'ici »), rien d'autre.
	 */
	import { Award, Map as MapIcon, ShieldCheck, Sparkles, Star, X } from 'lucide-svelte';
	import { portal } from '#lib/linkmusician/portal';
	import { untrack } from 'svelte';
	import type { Tone } from '../metro/tones';

	type Item = {
		id: string;
		kind: 'gain' | 'level' | 'achievement' | 'trust' | 'act';
		title: string;
		detail: string;
	};
	let { items, upTo }: { items: Item[]; upTo: string | null } = $props();

	/** Durée d'affichage d'une carte (ms). */
	const LIFETIME = 7000;
	let shown = $state<Item[]>([]);
	let acked: string | null = null;

	$effect(() => {
		if (!upTo || upTo === acked || items.length === 0) return;
		acked = upTo;
		const current = untrack(() => shown);
		const fresh = items.filter((i) => !current.some((s) => s.id === i.id));
		shown = [...current, ...fresh];
		for (const [k, item] of fresh.entries()) {
			setTimeout(() => dismiss(item.id), LIFETIME + k * 1200);
		}
		void fetch('/api/celebrations', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ upTo })
		}).catch(() => {
			// Pas grave : elles seront re-montrées à la prochaine visite.
		});
	});

	function dismiss(id: string) {
		shown = shown.filter((i) => i.id !== id);
	}

	// Un ton par sens (D55) : ce qui se gagne en ambre, la progression en
	// violet, la confiance (c'est confirmé) en citron.
	const style: Record<Item['kind'], { icon: typeof Star; tone: Tone }> = {
		gain: { icon: Star, tone: 'amber' },
		level: { icon: Sparkles, tone: 'violet' },
		achievement: { icon: Award, tone: 'amber' },
		// Épreuve de la carte franchie (P3-13).
		act: { icon: MapIcon, tone: 'violet' },
		trust: { icon: ShieldCheck, tone: 'lime' }
	};
</script>

<div
	use:portal
	class="lm-metro lm-celebrations pointer-events-none fixed inset-x-0 bottom-[calc(1rem+var(--lm-bottom-offset,0px))] z-50 flex flex-col items-center gap-2 px-4"
	role="status"
	aria-live="polite"
	aria-label="Célébrations"
>
	{#each shown as item (item.id)}
		{@const s = style[item.kind]}
		<div
			class="lm-tile lm-tile--flow lm-pop pointer-events-auto flex w-full max-w-sm items-center gap-3 p-3"
			data-tone={s.tone}
		>
			<s.icon class="size-6 shrink-0" aria-hidden="true" />
			<div class="min-w-0 flex-1">
				<p class="font-bold">{item.title}</p>
				{#if item.detail}<p class="truncate text-sm opacity-90">{item.detail}</p>{/if}
			</div>
			<button
				type="button"
				onclick={() => dismiss(item.id)}
				class="grid size-11 shrink-0 place-items-center rounded-full hover:bg-black/10"
				aria-label="Fermer"
			>
				<X class="size-4" aria-hidden="true" />
			</button>
		</div>
	{/each}
</div>
