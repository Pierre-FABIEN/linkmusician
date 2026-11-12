<script lang="ts">
	// LINKMUSICIAN: onboarding, étape d'un métier (ONB-02, D59), voir +page.server.ts.
	import * as Card from '#shadcn/card';
	import { Button } from '#shadcn/button';
	import SEO from '#lib/components/SEO.svelte';
	import TrackStepForm from '#lib/components/linkmusician/onboarding/TrackStepForm.svelte';
	import { previousStepPath } from '#lib/onboarding/steps';

	let { data } = $props();
	const back = $derived(previousStepPath(data.steps, data.stepId) ?? '/qui-es-tu');
</script>

<SEO title={`Ton métier : ${data.label}`} noindex nofollow />

<Card.Root class="shadow-xl">
	<Card.Content>
		{#key data.track}
			<TrackStepForm {data}>
				{#snippet heading()}
					<div>
						<h1 class="lm-title lm-title--sm">{data.label}</h1>
						<p class="text-sm text-muted-foreground">{data.description}</p>
					</div>
				{/snippet}
				{#snippet actions({ missing, empty, submitting })}
					<div class="flex justify-between">
						<Button variant="ghost" href={back}>Retour</Button>
						<Button type="submit" disabled={submitting || missing}>
							{data.soon && empty ? 'Passer cette étape' : 'Continuer'}
						</Button>
					</div>
				{/snippet}
			</TrackStepForm>
		{/key}
	</Card.Content>
</Card.Root>
