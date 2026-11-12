<script lang="ts">
	// LINKMUSICIAN: complétion de la personne, voir +page.server.ts.
	import { untrack } from 'svelte';
	import * as Form from '#shadcn/form';
	import { Input } from '#shadcn/input';
	import { Button } from '#shadcn/button';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { welcomeSchema } from '#lib/schema/actors/welcomeSchema';
	import { RETRY_FRIENDLY_FORM } from '#lib/forms/superformOptions';
	import SEO from '#lib/components/SEO.svelte';

	let { data } = $props();

	const welcomeForm = superForm(
		untrack(() => data.form),
		{ validators: zodClient(welcomeSchema), id: 'welcomeForm', ...RETRY_FRIENDLY_FORM }
	);
	const { form: welcomeData, enhance } = welcomeForm;
	import MetroPage from '#lib/components/linkmusician/metro/MetroPage.svelte';
</script>

<SEO title="Bienvenue" noindex nofollow />

<MetroPage>
	<div class="w-screen h-screen ccc">
		<div class="lm-tile lm-tile--flow w-[340px] mx-auto p-6">
			<h1 class="lm-title lm-title--sm mb-2">Bienvenue sur LinkMusician</h1>
			<p class="mb-6 text-sm text-muted-foreground">
				Encore une étape avant d'entrer : choisis ton identifiant public et confirme ton âge.
			</p>

			<form method="POST" use:enhance class="space-y-4">
				<Form.Field name="handle" form={welcomeForm}>
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Identifiant public</Form.Label>
							<div class="flex items-center gap-1">
								<span class="text-muted-foreground">@</span>
								<Input {...props} name="handle" bind:value={$welcomeData.handle} required />
							</div>
						{/snippet}
					</Form.Control>
					<Form.Description
						>Visible sur ton profil. Lettres minuscules, chiffres, « _ » et « - ».</Form.Description
					>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field name="birthDate" form={welcomeForm}>
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Date de naissance</Form.Label>
							<Input
								{...props}
								name="birthDate"
								type="date"
								autocomplete="bday"
								bind:value={$welcomeData.birthDate}
								required
							/>
						{/snippet}
					</Form.Control>
					<Form.Description
						>Jamais affichée, elle sert seulement à vérifier l'âge (16 ans minimum).</Form.Description
					>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field name="acceptTerms" form={welcomeForm}>
					<Form.Control>
						{#snippet children({ props })}
							<div class="flex items-start gap-2">
								<input
									{...props}
									type="checkbox"
									name="acceptTerms"
									class="mt-1 size-4"
									bind:checked={$welcomeData.acceptTerms}
								/>
								<Form.Label class="block font-normal leading-snug">
									J'accepte les <a href="/cgu" target="_blank" class="underline"
										>conditions d'utilisation</a
									>
									et la
									<a href="/confidentialite" target="_blank" class="underline"
										>politique de confidentialité</a
									>.
								</Form.Label>
							</div>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Button type="submit" class="w-full">Entrer dans LinkMusician</Button>
			</form>
		</div>
	</div>
</MetroPage>
