<script lang="ts">
	/**
	 * LINKMUSICIAN: « Ta prochaine étape » (P2-12b) : une seule action à la fois,
	 * avec l'avancement (« Étape X sur N »). Contenu calculé côté serveur.
	 * Héros Metro (MET-01) : une tuile au ton du mode, cible animée.
	 */
	import { ArrowRight, Target } from 'lucide-svelte';
	import Tile from './metro/Tile.svelte';
	import { toneOfMode } from './metro/tones';

	let {
		index,
		total,
		title,
		text,
		href,
		cta,
		tone = 'career'
	}: {
		index: number;
		total: number;
		title: string;
		text: string;
		href: string;
		cta: string;
		tone?: 'career' | 'jam';
	} = $props();
	const ratio = $derived(Math.min(1, Math.max(0, (index - 1) / total)));
</script>

<Tile
	tone={toneOfMode(tone === 'jam' ? 'JAM' : 'CAREER')}
	icon={Target}
	fx="target"
	class="lm-next-step"
>
	<section class="space-y-3" aria-labelledby="next-step-title">
		<div class="flex items-center justify-between gap-3 text-sm">
			<p class="lm-tile__kicker">Ta prochaine étape</p>
			<p class="lm-tile__text">Étape {index} sur {total}</p>
		</div>
		<div
			class="lm-bar"
			role="progressbar"
			aria-label="Avancement"
			aria-valuemin={0}
			aria-valuemax={total}
			aria-valuenow={index - 1}
		>
			<i style:--progress={ratio}></i>
		</div>
		<h2 id="next-step-title" class="lm-title lm-title--sm">{title}</h2>
		<p class="lm-tile__text max-w-prose">{text}</p>
		<a {href} class="lm-btn">
			{cta}
			<ArrowRight class="size-4" aria-hidden="true" />
		</a>
	</section>
</Tile>
