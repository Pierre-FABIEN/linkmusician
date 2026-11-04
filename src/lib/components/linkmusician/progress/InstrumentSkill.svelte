<script lang="ts">
	/**
	 * LINKMUSICIAN: instrument et niveau déclaré (D11, P1-02). La mention
	 * « déclaré » reste toujours visible : la plateforme ne certifie jamais un
	 * niveau.
	 */
	import { INSTRUMENT_LEVELS, type InstrumentLevel } from '#lib/skills/levels';
	import { Star } from 'lucide-svelte';

	let {
		name,
		level,
		primary = false,
		demos = 0,
		endorsements = 0
	}: {
		name: string;
		level: InstrumentLevel;
		primary?: boolean;
		demos?: number;
		endorsements?: number;
	} = $props();
	const info = $derived(INSTRUMENT_LEVELS[level - 1]);
	const extras = $derived(
		[
			demos ? `${demos} démo${demos > 1 ? 's' : ''}` : null,
			endorsements ? `endossé par ${endorsements}` : null
		].filter((e): e is string => e !== null)
	);
</script>

<div class="flex items-center gap-3 rounded-xl border bg-card p-3">
	<div class="min-w-0 flex-1">
		<div class="flex items-center gap-2">
			<span class="font-semibold">{name}</span>
			{#if primary}
				<span
					class="inline-flex items-center gap-0.5 text-xs text-fuchsia-700 dark:text-fuchsia-300"
				>
					<Star class="size-3 fill-current" aria-hidden="true" /> principal
				</span>
			{/if}
		</div>
		<div class="text-sm text-muted-foreground">
			{info.label}
			<span class="italic">(déclaré)</span>{#each extras as extra (extra)}&nbsp;· {extra}{/each}
		</div>
	</div>
	<div class="flex gap-1" role="img" aria-label="Niveau {level} sur 5 : {info.label}, déclaré">
		{#each [1, 2, 3, 4, 5] as n (n)}
			<span
				class="h-6 w-1.5 rounded-full {n <= level
					? 'bg-gradient-to-t from-violet-600 to-fuchsia-500'
					: 'bg-muted'}"
			></span>
		{/each}
	</div>
</div>
