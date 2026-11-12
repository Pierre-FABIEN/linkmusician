<script lang="ts">
	/**
	 * LINKMUSICIAN: formulaire de l'étape d'un métier (ONB-02). La page le
	 * recrée à chaque métier (`{#key}`) : SvelteKit réutilise la page d'une
	 * étape métier à la suivante, et le formulaire garderait l'état du métier
	 * précédent.
	 */
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import * as Card from '#shadcn/card';
	import { Button } from '#shadcn/button';
	import { trackDetailsSchema } from '#lib/schema/actors/trackDetailsSchema';
	import { INTENT_DIRECTION_LABELS } from '#lib/actors/specializations';
	import { previousStepPath } from '#lib/onboarding/steps';
	import { RETRY_FRIENDLY_FORM } from '#lib/forms/superformOptions';
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { IntentInfo } from '#lib/actors/specializations';
	import type { OnboardingStep, OnboardingStepId } from '#lib/onboarding/steps';
	import type { TrackDetailsForm } from '#lib/schema/actors/trackDetailsSchema';
	import type { TrackKindValue } from '#lib/actors/tracks';

	export type TrackStepData = {
		form: SuperValidated<TrackDetailsForm>;
		steps: OnboardingStep[];
		stepId: OnboardingStepId;
		track: TrackKindValue;
		label: string;
		description: string;
		soon: boolean;
		minSpecializations: number;
		specializations: { code: string; label: string; description: string }[];
		offers: readonly IntentInfo[];
		needs: readonly IntentInfo[];
	};

	let { data }: { data: TrackStepData } = $props();

	const stepForm = superForm(
		untrack(() => data.form),
		{
			validators: zodClient(trackDetailsSchema),
			id: untrack(() => `trackStepForm-${data.track}`),
			dataType: 'json',
			resetForm: false,
			...RETRY_FRIENDLY_FORM
		}
	);
	const { form, errors, enhance, submitting } = stepForm;

	const back = $derived(previousStepPath(data.steps, data.stepId) ?? '/qui-es-tu');
	const missing = $derived($form.specializations.length < data.minSpecializations);
	/** Erreur d'une liste : message global ou premier message d'un élément. */
	function listError(list: 'specializations' | 'offers' | 'needs'): string | null {
		const e = $errors[list] as unknown;
		if (!e) return null;
		if (Array.isArray(e)) return e.find((m) => typeof m === 'string') ?? null;
		const obj = e as { _errors?: string[] } & Record<string, string[] | undefined>;
		return obj._errors?.[0] ?? Object.values(obj).flat().find(Boolean) ?? null;
	}
	const intentLists = $derived(
		[
			{ key: 'offers' as const, items: data.offers, legend: INTENT_DIRECTION_LABELS.OFFER },
			{ key: 'needs' as const, items: data.needs, legend: INTENT_DIRECTION_LABELS.NEED }
		].filter((l) => l.items.length > 0)
	);
</script>

<Card.Root class="shadow-xl">
	<Card.Content>
		<form method="POST" use:enhance class="space-y-6">
			<input type="hidden" name="track" value={data.track} />
			<div>
				<h1 class="lm-title lm-title--sm">{data.label}</h1>
				<p class="text-sm text-muted-foreground">{data.description}</p>
				{#if data.soon}
					<p class="mt-2 text-sm text-muted-foreground">
						Ce métier arrive bientôt sur LinkMusician. Coche ce qui te correspond pour qu’on sache
						qui l’attend, ou passe cette étape.
					</p>
				{/if}
			</div>

			<fieldset
				class="space-y-2"
				aria-describedby={listError('specializations') ? 'specializations-error' : undefined}
			>
				<legend class="font-semibold">
					Tes spécialités
					<span class="font-normal text-muted-foreground">
						{data.minSpecializations > 0 ? '(au moins une)' : '(facultatif)'}
					</span>
				</legend>
				<div class="grid gap-2 sm:grid-cols-2">
					{#each data.specializations as item (item.code)}
						<label class="lm-tile lm-tile--flow flex cursor-pointer items-start gap-2 p-3">
							<input
								type="checkbox"
								value={item.code}
								class="mt-1 size-4"
								bind:group={$form.specializations}
							/>
							<span>
								<span class="font-medium">{item.label}</span>
								<span class="block text-sm text-muted-foreground">{item.description}</span>
							</span>
						</label>
					{/each}
				</div>
				{#if listError('specializations')}
					<p id="specializations-error" class="text-sm text-destructive" role="alert">
						{listError('specializations')}
					</p>
				{/if}
			</fieldset>

			{#each intentLists as list (list.key)}
				<fieldset
					class="space-y-2"
					aria-describedby={listError(list.key) ? `${list.key}-error` : undefined}
				>
					<legend class="font-semibold">
						{list.legend} <span class="font-normal text-muted-foreground">(facultatif)</span>
					</legend>
					<div class="flex flex-wrap gap-2">
						{#each list.items as item (item.code)}
							<label class="lm-tile lm-tile--flow flex cursor-pointer items-center gap-2 px-3 py-2">
								<input
									type="checkbox"
									value={item.code}
									class="size-4"
									bind:group={$form[list.key]}
								/>
								{item.label}
							</label>
						{/each}
					</div>
					{#if listError(list.key)}
						<p id="{list.key}-error" class="text-sm text-destructive" role="alert">
							{listError(list.key)}
						</p>
					{/if}
				</fieldset>
			{/each}

			<p class="text-xs text-muted-foreground">
				Tout est déclaratif et modifiable ensuite depuis ton profil.
			</p>

			<div class="flex justify-between">
				<Button variant="ghost" href={back}>Retour</Button>
				<Button type="submit" disabled={$submitting || missing}>
					{data.soon && $form.specializations.length === 0 ? 'Passer cette étape' : 'Continuer'}
				</Button>
			</div>
		</form>
	</Card.Content>
</Card.Root>
