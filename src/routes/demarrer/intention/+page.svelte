<script lang="ts">
	// LINKMUSICIAN: onboarding, « Ton profil de musicien·ne » (P1-10, ONB-03).
	import { Compass } from 'lucide-svelte';
	import * as Card from '#shadcn/card';
	import { Button } from '#shadcn/button';
	import SEO from '#lib/components/SEO.svelte';
	import MusicianStepForm from '#lib/components/linkmusician/musician/MusicianStepForm.svelte';
	import { previousStepPath } from '#lib/onboarding/steps';

	let { data } = $props();
</script>

<SEO title="Ton profil de musicien·ne" noindex nofollow />

<Card.Root class="shadow-xl">
	<Card.Content class="space-y-5">
		<div>
			<h1 class="lm-title lm-title--sm">Ton profil de musicien·ne</h1>
			<p class="text-sm text-muted-foreground">
				Deux questions, puis ce que tu cherches et ce que tu proposes. Cela oriente ce qu’on te
				montre en premier.
			</p>
		</div>
		<MusicianStepForm
			form={data.form}
			offers={data.offers}
			needs={data.needs}
			writing={data.writing}
			detailGroupIds={data.detailGroupIds}
			onboarding
		>
			{#snippet actions({ empty, submitting })}
				<div class="flex flex-wrap justify-between gap-2">
					<Button variant="ghost" href={previousStepPath(data.steps, 'intention') ?? '/qui-es-tu'}
						>Retour</Button
					>
					{#if empty}
						<Button type="submit" variant="outline" disabled={submitting}
							><Compass class="mr-1 size-4" /> Juste explorer</Button
						>
					{:else}
						<Button type="submit" disabled={submitting}>Continuer</Button>
					{/if}
				</div>
			{/snippet}
		</MusicianStepForm>
	</Card.Content>
</Card.Root>
