<script lang="ts">
	// LINKMUSICIAN: onboarding, récapitulatif (ONB-12a), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import * as Card from '#shadcn/card';
	import { Button } from '#shadcn/button';
	import { Badge } from '#shadcn/badge';
	import SEO from '#lib/components/SEO.svelte';
	import { previousStepPath } from '#lib/onboarding/steps';

	let { data } = $props();
	const back = $derived(previousStepPath(data.steps, 'recap') ?? '/qui-es-tu');
	let submitting = $state(false);
</script>

<SEO title="Ton récapitulatif" noindex nofollow />

<Card.Root class="shadow-xl">
	<Card.Content class="space-y-5">
		<div>
			<h1 class="lm-title lm-title--sm">Ton récapitulatif</h1>
			<p class="text-sm text-muted-foreground">
				Tout est déjà enregistré. Relis, corrige ce que tu veux : tu reviendras ici. Le reste se
				complète plus tard, depuis ton profil.
			</p>
		</div>

		<ul class="space-y-3">
			{#each data.sections as section (section.id)}
				{@const titleId = `recap-${section.id.replace(':', '-')}`}
				<li>
					<section aria-labelledby={titleId} class="rounded-lg border p-3">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<h2 id={titleId} class="flex items-center gap-2 font-semibold">
								{section.title}
								{#if section.soon}<Badge variant="secondary">bientôt</Badge>{/if}
							</h2>
							<Button
								variant="ghost"
								size="sm"
								href={section.editPath}
								aria-label={`Modifier : ${section.title}`}>Modifier</Button
							>
						</div>
						<dl class="mt-2 space-y-1.5 text-sm">
							{#each section.lines as line (line.label)}
								<div class="grid gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
									<dt class="text-muted-foreground">{line.label}</dt>
									<dd>
										{#if line.values.length > 0}
											{line.values.join(', ')}
										{:else}
											<span class="text-muted-foreground italic">Non renseigné</span>
										{/if}
									</dd>
								</div>
							{/each}
						</dl>
					</section>
				</li>
			{/each}
		</ul>

		<form
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
			class="flex flex-wrap justify-between gap-2"
		>
			<Button variant="ghost" href={back}>Retour</Button>
			<Button type="submit" disabled={submitting}>Terminer mon inscription</Button>
		</form>
	</Card.Content>
</Card.Root>
