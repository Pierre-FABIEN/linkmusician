<script lang="ts">
	/**
	 * LINKMUSICIAN: bandeau d'un écran pré-rempli par l'assistant
	 * d'inscription (P3-17). Rien n'est enregistré avant « Continuer ».
	 */
	import { Sparkles } from 'lucide-svelte';

	let { onIgnore }: { onIgnore: () => void } = $props();
</script>

<div
	role="status"
	class="lm-note flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm"
	data-tone="violet"
>
	<Sparkles class="size-4 shrink-0" aria-hidden="true" />
	<span class="flex-1">Pré-rempli d’après ta description : vérifie, modifie, puis continue.</span>
	<button type="button" class="min-h-11 font-medium underline" onclick={onIgnore}
		>Tout retirer</button
	>
</div>
