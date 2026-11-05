<script lang="ts">
	/**
	 * LINKMUSICIAN: « Ta prochaine étape » (P2-12b) : une seule action à la fois,
	 * avec l'avancement (« Étape X sur N »). Contenu calculé côté serveur.
	 */
	import { ArrowRight } from 'lucide-svelte';

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

<section
	class="space-y-3 rounded-3xl border-2 p-5 shadow-sm {tone === 'jam'
		? 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/40'
		: 'border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40'}"
	aria-labelledby="next-step-title"
>
	<div class="flex items-center justify-between gap-3 text-sm">
		<p class="font-bold uppercase">Ta prochaine étape</p>
		<p class="text-muted-foreground">Étape {index} sur {total}</p>
	</div>
	<div
		class="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
		role="progressbar"
		aria-label="Avancement"
		aria-valuemin={0}
		aria-valuemax={total}
		aria-valuenow={index - 1}
	>
		<div
			class="h-full rounded-full {tone === 'jam' ? 'bg-orange-500' : 'bg-violet-600'}"
			style:width="{ratio * 100}%"
		></div>
	</div>
	<h2 id="next-step-title" class="text-2xl font-black tracking-tight">{title}</h2>
	<p class="text-muted-foreground">{text}</p>
	<a
		{href}
		class="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 font-bold text-white {tone ===
		'jam'
			? 'bg-gradient-to-r from-orange-600 to-pink-600'
			: 'bg-gradient-to-r from-violet-600 to-fuchsia-600'}"
	>
		{cta}
		<ArrowRight class="size-4" aria-hidden="true" />
	</a>
</section>
