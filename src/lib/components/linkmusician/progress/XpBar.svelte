<script lang="ts">
	/** LINKMUSICIAN: barre d'XP du niveau en cours (P1-02). */
	let {
		level,
		xp,
		xpIntoLevel,
		xpForNextLevel,
		compact = false
	}: {
		level: number;
		xp: number;
		xpIntoLevel: number;
		xpForNextLevel: number;
		compact?: boolean;
	} = $props();
	const ratio = $derived(
		xpForNextLevel > 0 ? Math.min(1, Math.max(0, xpIntoLevel / xpForNextLevel)) : 0
	);
</script>

<div class="space-y-1.5">
	{#if !compact}
		<div class="flex items-baseline justify-between text-sm">
			<span class="font-medium">{xp.toLocaleString('fr-FR')} XP</span>
			<span class="text-muted-foreground">
				encore {(xpForNextLevel - xpIntoLevel).toLocaleString('fr-FR')} XP avant le niveau {level +
					1}
			</span>
		</div>
	{/if}
	<div
		class="relative h-3 overflow-hidden rounded-full bg-muted"
		role="progressbar"
		aria-label="Progression vers le niveau {level + 1}"
		aria-valuemin={0}
		aria-valuemax={xpForNextLevel}
		aria-valuenow={xpIntoLevel}
	>
		<div
			class="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 transition-[width] duration-700"
			style:width="{Math.round(ratio * 100)}%"
		></div>
	</div>
</div>
