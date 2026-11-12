<script lang="ts">
	/**
	 * LINKMUSICIAN: formulaire « Ton profil de musicien·ne » (ONB-03, D58),
	 * partagé par le dernier écran de l'onboarding (`/demarrer/intention`) et
	 * « Ma pratique » (`/profil/pratique`). Expérience et engagement requis ;
	 * le reste est facultatif. Les précisions ne montrent que les instruments
	 * de la personne.
	 */
	import { onMount, untrack, type Snippet } from 'svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { SuperValidated } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import { RETRY_FRIENDLY_FORM } from '#lib/forms/superformOptions';
	import {
		musicianStepSchema,
		type MusicianStepForm
	} from '#lib/schema/musician/musicianStepSchema';
	import {
		COMMITMENT_INFO,
		COMMITMENTS,
		DETAIL_GROUPS,
		intentsOfLookingFor,
		PRACTICE_EXPERIENCE_INFO,
		PRACTICE_EXPERIENCES
	} from '#lib/musician/profile';
	import type { IntentInfo } from '#lib/actors/specializations';
	import ProposedNotice from '#lib/components/linkmusician/onboarding/ProposedNotice.svelte';
	import { reportUsage, takeProposal } from '#lib/onboarding/proposals';

	type Option = { code: string; label: string; description: string };

	let {
		form: initial,
		offers,
		needs,
		writing,
		detailGroupIds,
		onboarding = false,
		actions
	}: {
		form: SuperValidated<MusicianStepForm>;
		offers: readonly IntentInfo[];
		needs: readonly IntentInfo[];
		writing: readonly Option[];
		/** Groupes de précisions qui concernent les instruments de la personne. */
		detailGroupIds: readonly string[];
		/** Dernier écran de l'onboarding : propositions de l'assistant (D47). */
		onboarding?: boolean;
		/** Boutons du bas ; reçoit « rien de coché » et « envoi en cours ». */
		actions: Snippet<[{ empty: boolean; submitting: boolean }]>;
	} = $props();

	const stepForm = superForm(
		untrack(() => initial),
		{
			validators: zodClient(musicianStepSchema),
			id: 'musicianStepForm',
			dataType: 'json',
			resetForm: false,
			...RETRY_FRIENDLY_FORM,
			onUpdated: ({ form }) => {
				if (form.valid && form.message) toast.success(form.message);
			}
		}
	);
	const { form, errors, enhance, submitting, message } = stepForm;

	const groups = $derived(DETAIL_GROUPS.filter((g) => detailGroupIds.includes(g.id)));
	const empty = $derived($form.offers.length === 0 && $form.needs.length === 0);

	// Assistant d'inscription (P3-17) : ce qu'elle cherche, en « Je propose » / « Je recherche ».
	let proposed = $state(false);
	onMount(() => {
		if (!onboarding) return;
		const p = takeProposal('intention');
		if (!p?.length || $form.offers.length || $form.needs.length) return;
		const intents = intentsOfLookingFor(p);
		$form.offers = intents.offers;
		$form.needs = intents.needs;
		proposed = intents.offers.length + intents.needs.length > 0;
	});
	function ignoreProposals() {
		$form.offers = [];
		$form.needs = [];
		proposed = false;
		reportUsage('ignored');
	}

	/** Coche ou décoche un code de « Je recherche » ou « Je propose ». */
	function toggleCode(list: 'needs' | 'offers', code: string) {
		$form[list] = $form[list].includes(code)
			? $form[list].filter((c) => c !== code)
			: [...$form[list], code];
	}

	/** Coche ou décoche un code d'une précision (choix unique : remplace). */
	function toggleDetail(fieldId: string, code: string, single: boolean) {
		const current = $form.details[fieldId] ?? [];
		const next = current.includes(code)
			? current.filter((c) => c !== code)
			: single
				? [code]
				: [...current, code];
		$form.details = { ...$form.details, [fieldId]: next };
	}
	const firstError = (e: unknown): string | null => {
		if (!e) return null;
		if (typeof e === 'string') return e;
		if (Array.isArray(e)) return e.find((m) => typeof m === 'string') ?? null;
		// Erreur de la liste (`_errors`) ou d'un de ses éléments (`{ 0: [...] }`).
		const obj = e as Record<string, unknown>;
		for (const value of [obj._errors, ...Object.values(obj)]) {
			const found = firstError(value);
			if (found) return found;
		}
		return null;
	};
</script>

<form method="POST" use:enhance class="space-y-8">
	{#if $message && !onboarding}<p class="sr-only" role="status">{$message}</p>{/if}

	{#snippet radios(
		name: 'practiceExperience' | 'commitment',
		legend: string,
		values: readonly string[],
		info: Record<string, { label: string; hint: string }>
	)}
		<fieldset class="space-y-2" aria-describedby={$errors[name] ? `${name}-error` : undefined}>
			<legend class="font-semibold">{legend}</legend>
			<div class="grid gap-2 sm:grid-cols-3">
				{#each values as v (v)}
					<label class="lm-tile lm-tile--flow flex cursor-pointer items-start gap-2 p-3">
						<input
							type="radio"
							{name}
							value={v}
							class="mt-1 size-4"
							checked={$form[name] === v}
							onchange={() => (($form[name] as string | undefined) = v)}
						/>
						<span>
							<span class="font-medium">{info[v].label}</span>
							<span class="block text-sm text-muted-foreground">{info[v].hint}</span>
						</span>
					</label>
				{/each}
			</div>
			{#if $errors[name]}
				<p id="{name}-error" class="text-sm text-destructive" role="alert">{$errors[name]}</p>
			{/if}
		</fieldset>
	{/snippet}

	{@render radios(
		'practiceExperience',
		'Où en es-tu ?',
		PRACTICE_EXPERIENCES,
		PRACTICE_EXPERIENCE_INFO
	)}
	{@render radios('commitment', 'Quel engagement cherches-tu ?', COMMITMENTS, COMMITMENT_INFO)}

	{#if proposed}<ProposedNotice onIgnore={ignoreProposals} />{/if}

	{#snippet chips(list: 'needs' | 'offers', legend: string, items: readonly IntentInfo[])}
		<fieldset class="space-y-2">
			<legend class="font-semibold">
				{legend} <span class="font-normal text-muted-foreground">(facultatif)</span>
			</legend>
			<div class="grid gap-2 sm:grid-cols-2">
				{#each items as item (item.code)}
					<label class="lm-tile lm-tile--flow flex cursor-pointer items-start gap-2 p-3">
						<!-- Pas de `bind:group` dans un snippet rendu deux fois : Svelte
						     réunirait les deux listes en un seul groupe. -->
						<input
							type="checkbox"
							value={item.code}
							class="mt-1 size-4"
							checked={$form[list].includes(item.code)}
							onchange={() => toggleCode(list, item.code)}
						/>
						<span>
							<span class="font-medium">{item.label}</span>
							<span class="block text-sm text-muted-foreground">{item.description}</span>
						</span>
					</label>
				{/each}
			</div>
			{#if firstError($errors[list])}
				<p class="text-sm text-destructive" role="alert">{firstError($errors[list])}</p>
			{/if}
		</fieldset>
	{/snippet}

	{@render chips('needs', 'Je recherche', needs)}
	{@render chips('offers', 'Je propose', offers)}

	<fieldset class="space-y-2">
		<legend class="font-semibold">
			Tu écris aussi ? <span class="font-normal text-muted-foreground">(facultatif)</span>
		</legend>
		<div class="flex flex-wrap gap-2">
			{#each writing as w (w.code)}
				<label class="lm-tile lm-tile--flow flex cursor-pointer items-center gap-2 px-3 py-2">
					<input type="checkbox" value={w.code} class="size-4" bind:group={$form.specializations} />
					{w.label}
				</label>
			{/each}
		</div>
		<p class="text-xs text-muted-foreground">
			C’est ton rôle, pas une part d’auteur : les crédits d’un morceau se confirment à plusieurs.
		</p>
	</fieldset>

	{#if groups.length > 0}
		<div class="space-y-2">
			<h2 class="font-semibold">
				Préciser <span class="font-normal text-muted-foreground">(facultatif)</span>
			</h2>
			{#each groups as g (g.id)}
				<details class="lm-tile lm-tile--flow p-3">
					<summary class="cursor-pointer font-medium">{g.label}</summary>
					<div class="mt-3 space-y-3">
						{#each g.fields as f (f.id)}
							<fieldset>
								<legend class="text-sm font-medium">{f.label}</legend>
								<div class="mt-1 flex flex-wrap gap-2">
									{#each f.options as o (o.code)}
										<label class="flex cursor-pointer items-center gap-1.5 text-sm">
											<input
												type="checkbox"
												class="size-4"
												checked={($form.details[f.id] ?? []).includes(o.code)}
												onchange={() => toggleDetail(f.id, o.code, f.kind === 'single')}
											/>
											{o.label}
										</label>
									{/each}
								</div>
							</fieldset>
						{/each}
					</div>
				</details>
			{/each}
		</div>
	{/if}

	{#if $errors._errors?.[0]}
		<p class="text-sm text-destructive" role="alert">{$errors._errors[0]}</p>
	{/if}

	<p class="text-xs text-muted-foreground">
		Tout est déclaratif et modifiable ensuite dans « Ma pratique ».
	</p>

	{@render actions({ empty, submitting: $submitting })}
</form>
