<script lang="ts">
	/** LINKMUSICIAN: barre des 6 étapes de l'onboarding (P1-10, maquette P1-02). */
	import { Check } from 'lucide-svelte';
	import { ONBOARDING_STEPS, stepNumber, type OnboardingStepId } from '#lib/onboarding/steps';

	let { current }: { current: OnboardingStepId } = $props();
	const n = $derived(stepNumber(current));
</script>

<nav aria-label="Étapes de l'inscription">
	<ol class="flex items-center gap-1">
		{#each ONBOARDING_STEPS as s, i (s.id)}
			<li
				class="flex flex-1 flex-col items-center gap-1.5"
				aria-current={i + 1 === n ? 'step' : undefined}
			>
				<span
					class="grid size-8 place-items-center rounded-full text-sm font-bold {i + 1 < n
						? 'bg-primary text-primary-foreground'
						: i + 1 === n
							? 'bg-foreground text-background ring-4 ring-primary/30'
							: 'bg-muted text-muted-foreground'}"
				>
					{#if i + 1 < n}<Check class="size-4" aria-hidden="true" /><span class="sr-only"
							>fait :</span
						>{:else}{i + 1}{/if}
				</span>
				<span class="hidden text-center text-[11px] text-muted-foreground sm:block">{s.label}</span>
			</li>
		{/each}
	</ol>
	<p class="mt-2 text-center text-xs text-muted-foreground">Étape {n} sur 6</p>
</nav>
