<script lang="ts">
	// LINKMUSICIAN: mise en page de l'onboarding (P1-10).
	import { page } from '$app/state';
	import StepBar from '#lib/components/linkmusician/onboarding/StepBar.svelte';
	import type { OnboardingStepId } from '#lib/onboarding/steps';

	let { children } = $props();
	const stepId = $derived((page.data as { stepId?: OnboardingStepId }).stepId);
</script>

<div class="min-h-screen w-screen px-4 pt-24 pb-16">
	<div class="mx-auto space-y-6 {stepId === 'resultat' ? 'max-w-5xl' : 'max-w-xl'}">
		{#if stepId}<StepBar current={stepId} />{/if}
		{@render children()}
	</div>
</div>
