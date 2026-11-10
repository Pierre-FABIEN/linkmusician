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
	class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-fuchsia-300 bg-fuchsia-50 p-3 text-sm dark:border-fuchsia-800 dark:bg-fuchsia-950/30"
>
	<Sparkles class="size-4 shrink-0 text-fuchsia-600" aria-hidden="true" />
	<span class="flex-1">Pré-rempli d’après ta description : vérifie, modifie, puis continue.</span>
	<button type="button" class="min-h-11 font-medium underline" onclick={onIgnore}
		>Tout retirer</button
	>
</div>
