<script lang="ts">
	import { untrack } from 'svelte';
	import * as Form from '#shadcn/form';
	import { Input } from '#shadcn/input';
	import { Button } from '#shadcn/button';
	import { superForm } from 'sveltekit-superforms/client';
	import { signupSchema } from '#lib/schema/auth/signupSchema';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { RETRY_FRIENDLY_FORM } from '#lib/forms/superformOptions';
	import { authClient } from '#lib/auth/client';

	let { data } = $props();

	async function signInWithGoogle() {
		await authClient.signIn.social({ provider: 'google', callbackURL: '/auth' });
	}

	const signupForm = superForm(
		untrack(() => data.form),
		{
			validators: zodClient(signupSchema),
			id: 'signupForm',
			...RETRY_FRIENDLY_FORM
		}
	);

	const { form: signupData, enhance: signupEnhance, message: signupMessage } = signupForm;

	$effect(() => {
		if ($signupMessage === 'vous etes deja inscrit avec cette adresse email.') {
			toast.error($signupMessage);
			setTimeout(() => goto('/auth/login'), 0);
		}
	});
</script>

<div class="w-screen h-screen ccc">
	<div class="w-[300px] mx-auto p-6 border shadow-lg rounded-lg backdrop-blur-3xl">
		<h1 class="mb-4 text-2xl font-bold">Créer un compte</h1>

		{#if data.referralCode}
			<p class="mb-4 text-sm text-muted-foreground">
				Vous avez été invité·e par un ami ·e 🎉 votre première commande bénéficiera d'une remise.
			</p>
		{/if}

		<form method="POST" use:signupEnhance action="?/signup" class="space-y-4">
			<input type="hidden" name="ref" value={data.referralCode ?? ''} />
			<div class="mb-4">
				<Form.Field name="username" form={signupForm}>
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Nom d'utilisateur</Form.Label>
							<Input
								{...props}
								name="username"
								type="text"
								bind:value={$signupData.username}
								required
							/>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>

			<div class="mb-4">
				<Form.Field name="email" form={signupForm}>
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Email</Form.Label>
							<Input {...props} name="email" type="email" bind:value={$signupData.email} required />
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>

			<div class="mb-4">
				<Form.Field name="password" form={signupForm}>
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Mot de passe</Form.Label>
							<Input
								{...props}
								name="password"
								type="password"
								bind:value={$signupData.password}
								required
							/>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>

			<!-- LINKMUSICIAN ▼ date de naissance (16 ans minimum) et CGU, décisions D5 et D16. -->
			<div class="mb-4">
				<Form.Field name="birthDate" form={signupForm}>
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Date de naissance</Form.Label>
							<Input
								{...props}
								name="birthDate"
								type="date"
								autocomplete="bday"
								bind:value={$signupData.birthDate}
								required
							/>
						{/snippet}
					</Form.Control>
					<Form.Description>Jamais affichée, elle sert seulement à vérifier l'âge.</Form.Description
					>
					<Form.FieldErrors />
				</Form.Field>
			</div>

			<div class="mb-4">
				<Form.Field name="acceptTerms" form={signupForm}>
					<Form.Control>
						{#snippet children({ props })}
							<div class="flex items-start gap-2">
								<input
									{...props}
									type="checkbox"
									name="acceptTerms"
									class="mt-1 size-4"
									bind:checked={$signupData.acceptTerms}
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
			</div>
			<!-- LINKMUSICIAN ▲ -->

			<div class="mt-6">
				<Button type="submit">S'inscrire</Button>
			</div>
		</form>

		<Button type="button" class="w-full mt-10" onclick={signInWithGoogle}>
			Sign in with Google
		</Button>
	</div>
</div>
