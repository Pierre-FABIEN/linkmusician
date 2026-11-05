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
	class="group flex items-center gap-3 rounded-xl border bg-card p-4 transition {href
		? 'hover:-translate-y-0.5 hover:border-fuchsia-400 hover:shadow-md'
		: 'opacity-80'}"
>
	<span
		class="grid size-10 shrink-0 place-items-center rounded-lg bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300"
	>
		<Target class="size-5" aria-hidden="true" />
	</span>
	<span class="min-w-0 flex-1 space-y-1">
		<span class="block font-medium leading-snug">{label}</span>
		{#if progress}
			<span class="flex items-center gap-2 text-xs text-muted-foreground">
				<span class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
					<span
						class="block h-full rounded-full bg-fuchsia-500"
						style:width="{Math.round((progress.current / progress.target) * 100)}%"
					></span>
				</span>
				{progress.current}/{progress.target}
			</span>
		{:else if xp}
			<span class="block text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300"
				>+{xp} XP</span
			>
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
