<script lang="ts" module>
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { IntentInfo } from '#lib/actors/specializations';
	import type { FieldStage, TrackField } from '#lib/actors/trackFields';
	import type { TrackDetailsForm } from '#lib/schema/actors/trackDetailsSchema';
	import type { TrackKindValue } from '#lib/actors/tracks';

	/** Données d'un écran métier (`trackStepData`, `#lib/server/actors/trackStep`). */
	export type TrackStepData = {
		form: SuperValidated<TrackDetailsForm>;
		track: TrackKindValue;
		label: string;
		description: string;
		soon: boolean;
		minSpecializations: number;
		specializations: { code: string; label: string; description: string }[];
		offers: readonly IntentInfo[];
		needs: readonly IntentInfo[];
		fields: readonly TrackField[];
		/** Inscription : sans les champs du profil avancé (ONB-12c3). */
		stage?: FieldStage;
	};
</script>

<script lang="ts">
	/**
	 * LINKMUSICIAN: formulaire d'un métier (ONB-02, D59) : spécialités,
	 * « Je propose », « Je recherche », puis les champs propres du métier,
	 * affichés selon ce qui est coché. Partagé par l'étape de l'onboarding et
	 * la page du métier ; la page le recrée à chaque métier (`{#key}`), car
	 * SvelteKit réutilise la page d'un métier au suivant.
	 *
	 * Pas de `bind:group` dans les boucles : Svelte réunirait les listes d'une
	 * même boucle en un seul groupe (offres et besoins liés, constaté en ONB-03).
	 */
	import { untrack, type Snippet } from 'svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import { trackDetailsSchema } from '#lib/schema/actors/trackDetailsSchema';
	import { INTENT_DIRECTION_LABELS } from '#lib/actors/specializations';
	import { isRequired, visibleFields } from '#lib/actors/trackFields';
	import { RETRY_FRIENDLY_FORM } from '#lib/forms/superformOptions';

	let {
		data,
		heading,
		actions
	}: {
		data: TrackStepData;
		/** Titre de l'écran (l'onboarding le met dans sa carte). */
		heading?: Snippet;
		/** Boutons du bas ; reçoit « spécialité manquante », « rien coché », « envoi en cours ». */
		actions: Snippet<[{ missing: boolean; empty: boolean; submitting: boolean }]>;
	} = $props();

	const stepForm = superForm(
		untrack(() => data.form),
		{
			validators: zodClient(trackDetailsSchema),
			id: untrack(() => `trackStepForm-${data.track}`),
			dataType: 'json',
			resetForm: false,
			...RETRY_FRIENDLY_FORM,
			onUpdated: ({ form }) => {
				if (form.valid && form.message) toast.success(form.message);
			}
		}
	);
	const { form, errors, enhance, submitting } = stepForm;

	const missing = $derived($form.specializations.length < data.minSpecializations);
	const empty = $derived($form.specializations.length === 0);
	const shown = $derived(visibleFields(data.track, $form, data.stage));

	type List = 'specializations' | 'offers' | 'needs';
	function toggle(list: List, code: string) {
		$form[list] = $form[list].includes(code)
			? $form[list].filter((c) => c !== code)
			: [...$form[list], code];
	}
	function toggleAnswer(id: string, code: string, single: boolean) {
		const current = $form.details[id] ?? [];
		const next = current.includes(code)
			? current.filter((c) => c !== code)
			: single
				? [code]
				: [...current, code];
		$form.details = { ...$form.details, [id]: next };
	}
	/** Premier message d'une erreur, quelle que soit sa forme (liste, élément, formulaire). */
	function firstError(e: unknown): string | null {
		if (!e) return null;
		if (typeof e === 'string') return e;
		if (Array.isArray(e)) return e.find((m) => typeof m === 'string') ?? null;
		for (const value of Object.values(e as Record<string, unknown>)) {
			const found = firstError(value);
			if (found) return found;
		}
		return null;
	}
	const intentLists = $derived(
		[
			{ key: 'offers' as const, items: data.offers, legend: INTENT_DIRECTION_LABELS.OFFER },
			{ key: 'needs' as const, items: data.needs, legend: INTENT_DIRECTION_LABELS.NEED }
		].filter((l) => l.items.length > 0)
	);
</script>

<form method="POST" use:enhance class="space-y-6">
	{@render heading?.()}
	{#if data.soon}
		<p class="text-sm text-muted-foreground">
			Ce métier arrive bientôt sur LinkMusician. Coche ce qui te correspond pour qu’on sache qui
			l’attend ; rien n’est obligatoire.
		</p>
	{/if}

	<fieldset
		class="space-y-2"
		aria-describedby={firstError($errors.specializations) ? 'specializations-error' : undefined}
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
						checked={$form.specializations.includes(item.code)}
						onchange={() => toggle('specializations', item.code)}
					/>
					<span>
						<span class="font-medium">{item.label}</span>
						<span class="block text-sm text-muted-foreground">{item.description}</span>
					</span>
				</label>
			{/each}
		</div>
		{#if firstError($errors.specializations)}
			<p id="specializations-error" class="text-sm text-destructive" role="alert">
				{firstError($errors.specializations)}
			</p>
		{/if}
	</fieldset>

	{#each intentLists as list (list.key)}
		<fieldset class="space-y-2">
			<legend class="font-semibold">
				{list.legend} <span class="font-normal text-muted-foreground">(facultatif)</span>
			</legend>
			<div class="grid gap-2 sm:grid-cols-2">
				{#each list.items as item (item.code)}
					<label class="lm-tile lm-tile--flow flex cursor-pointer items-start gap-2 p-3">
						<input
							type="checkbox"
							value={item.code}
							class="mt-1 size-4"
							checked={$form[list.key].includes(item.code)}
							onchange={() => toggle(list.key, item.code)}
						/>
						<span>
							<span class="font-medium">{item.label}</span>
							<span class="block text-sm text-muted-foreground">{item.description}</span>
						</span>
					</label>
				{/each}
			</div>
			{#if firstError($errors[list.key])}
				<p class="text-sm text-destructive" role="alert">{firstError($errors[list.key])}</p>
			{/if}
		</fieldset>
	{/each}

	{#each shown as field (field.id)}
		{@const required = isRequired(data.track, field)}
		<fieldset class="space-y-2">
			<legend class="font-semibold">
				{field.label}
				<span class="font-normal text-muted-foreground">
					{required ? '(requis)' : '(facultatif)'}
				</span>
			</legend>
			{#if field.hint}<p class="text-xs text-muted-foreground">{field.hint}</p>{/if}
			<div class="flex flex-wrap gap-2">
				{#each field.options as o (o.code)}
					<label class="lm-tile lm-tile--flow flex cursor-pointer items-center gap-2 px-3 py-2">
						<input
							type={field.kind === 'single' ? 'radio' : 'checkbox'}
							name="field-{field.id}"
							value={o.code}
							class="size-4"
							checked={($form.details[field.id] ?? []).includes(o.code)}
							onchange={() => toggleAnswer(field.id, o.code, field.kind === 'single')}
						/>
						{o.label}
					</label>
				{/each}
			</div>
		</fieldset>
	{/each}

	{#if firstError($errors._errors)}
		<p class="text-sm text-destructive" role="alert">{firstError($errors._errors)}</p>
	{/if}

	<p class="text-xs text-muted-foreground">
		Tout est déclaratif : rien n’est vérifié ni revendiqué par cette fiche.
	</p>

	{@render actions({ missing, empty, submitting: $submitting })}
</form>
