<script lang="ts">
	/** LINKMUSICIAN: succès (badge ponctuel, P1-02) ; tuile ambre une fois débloqué (D55). */
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
	class="lm-tile lm-tile--flow flex items-center gap-3 p-3 {unlocked ? '' : 'opacity-70'}"
	data-tone={unlocked ? 'amber' : undefined}
>
	<span
		class="lm-chip rounded-full {unlocked ? '' : 'text-muted-foreground'}"
		data-tone={unlocked ? 'amber' : undefined}
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
			<span class="block text-xs font-medium">{rarity} % des musiciens</span>
		{/if}
	</span>
	{#if !unlocked}<span class="sr-only">(à débloquer)</span>{/if}
</div>
