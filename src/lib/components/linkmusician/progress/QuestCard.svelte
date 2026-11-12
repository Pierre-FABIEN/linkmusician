<script lang="ts">
	/**
	 * LINKMUSICIAN: prochain objectif atteignable (quête système, P1-02).
	 * `href` nul : l'écran qui permet d'avancer n'existe pas encore (« bientôt »).
	 */
	import { ArrowRight, Target } from 'lucide-svelte';

	let {
		label,
		href,
		xp,
		progress
	}: {
		label: string;
		href: string | null;
		xp?: number;
		progress?: { current: number; target: number };
	} = $props();
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	href={href ?? undefined}
	class="lm-tile lm-tile--flow group flex items-center gap-3 p-4 {href
		? 'hover:-translate-y-0.5 hover:shadow-md'
		: 'opacity-80'}"
>
	<span class="lm-chip" data-tone="amber">
		<Target class="size-5" aria-hidden="true" />
	</span>
	<span class="min-w-0 flex-1 space-y-1">
		<span class="block font-medium leading-snug">{label}</span>
		{#if progress}
			<span class="flex items-center gap-2 text-xs text-muted-foreground">
				<span class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
					<span
						class="lm-fill block h-full rounded-full"
						data-tone="amber"
						style:width="{Math.round((progress.current / progress.target) * 100)}%"
					></span>
				</span>
				{progress.current}/{progress.target}
			</span>
		{:else if xp}
			<span class="block text-xs font-semibold text-foreground">+{xp} XP</span>
		{/if}
	</span>
	{#if href}
		<ArrowRight
			class="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5"
			aria-hidden="true"
		/>
	{:else}
		<span class="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
			>Bientôt</span
		>
	{/if}
</svelte:element>
