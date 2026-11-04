<script lang="ts">
	/** LINKMUSICIAN: succès (badge ponctuel, P1-02). */
	import { Award, Lock } from 'lucide-svelte';

	let {
		name,
		description,
		unlockedAt = null,
		rarity = null
	}: {
		name: string;
		description: string;
		unlockedAt?: Date | string | null;
		rarity?: number | null;
	} = $props();
	const unlocked = $derived(unlockedAt !== null);
</script>

<div
	class="flex items-center gap-3 rounded-xl border p-3 {unlocked
		? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30'
		: 'bg-muted/40 opacity-70'}"
>
	<span
		class="grid size-11 shrink-0 place-items-center rounded-full {unlocked
			? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30'
			: 'bg-muted text-muted-foreground'}"
	>
		{#if unlocked}<Award class="size-5" aria-hidden="true" />{:else}<Lock
				class="size-4"
				aria-hidden="true"
			/>{/if}
	</span>
	<span class="min-w-0">
		<span class="block font-semibold leading-tight">{name}</span>
		<span class="block text-xs text-muted-foreground">{description}</span>
		{#if unlocked && rarity !== null}
			<span class="block text-xs font-medium text-amber-700 dark:text-amber-300"
				>{rarity} % des musiciens</span
			>
		{/if}
	</span>
	{#if !unlocked}<span class="sr-only">(à débloquer)</span>{/if}
</div>
