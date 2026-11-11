<script lang="ts">
	/**
	 * LINKMUSICIAN: en-tête d'un écran Metro (D55, `docs/design` §4.5) : un
	 * sur-titre qui situe, le titre de l'écran (`lm-title`, le seul `h1` de la
	 * page) et une phrase d'introduction. Le retour au menu passe par le fil
	 * d'Ariane de la coquille (D52) ; `back` ajoute un lien de retour visible
	 * pour un écran hors coquille. Remplace `SubPageHeader`.
	 */
	import type { Snippet } from 'svelte';
	import { ArrowLeft } from 'lucide-svelte';

	let {
		title,
		intro,
		kicker,
		back,
		actions
	}: {
		title: string;
		intro?: string;
		/** Sur-titre court en majuscules espacées (« Mode jam », « Ton réseau »). */
		kicker?: string;
		back?: { href: string; label: string };
		/** Action principale de l'écran, alignée sur le titre en grand écran. */
		actions?: Snippet;
	} = $props();
</script>

<header class="space-y-3">
	{#if back}
		<a
			href={back.href}
			class="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:underline"
		>
			<ArrowLeft class="size-4" aria-hidden="true" />{back.label}
		</a>
	{/if}
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div class="min-w-0 space-y-2">
			{#if kicker}<p class="lm-kicker text-muted-foreground">{kicker}</p>{/if}
			<h1 class="lm-title break-words">{title}</h1>
		</div>
		{#if actions}<div class="shrink-0">{@render actions()}</div>{/if}
	</div>
	{#if intro}<p class="max-w-2xl text-muted-foreground">{intro}</p>{/if}
</header>
