<script lang="ts">
	// LINKMUSICIAN: accueil avec connexion, voir +page.server.ts. La vraie page
	// d'accueil (présentation, identité visuelle) arrive avec le lot P0-05.
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Form from '#shadcn/form';
	import { Input } from '#shadcn/input';
	import { Button } from '#shadcn/button';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { RETRY_FRIENDLY_FORM } from '#lib/forms/superformOptions';
	import { loginSchema } from '#lib/schema/auth/loginSchema';
	import { authClient } from '#lib/auth/client';
	import { APP_HOME } from '#lib/linkmusician/home';
	import SEO from '#lib/components/SEO.svelte';

	let { data } = $props();

	const loginForm = superForm(
		untrack(() => data.loginForm),
		{
			validators: zodClient(loginSchema),
			id: 'homeLoginForm',
			// L'action renvoie ses refus (« Invalid password »…) en succès porteur d'un
			// message : sans cette option, le formulaire se viderait, email compris.
			resetForm: false,
			...RETRY_FRIENDLY_FORM
		}
	);
	const { form: loginData, enhance, message, submitting } = loginForm;

	$effect(() => {
		if ($message) toast.error($message);
	});

	async function signInWithGoogle() {
		// L'espace oriente vers `/bienvenue` un compte Google encore sans personne.
		await authClient.signIn.social({ provider: 'google', callbackURL: APP_HOME });
	}
</script>

<SEO pageKey="home" />

<div class="min-h-screen w-screen px-4 py-24 ccc">
	<div class="w-full max-w-sm space-y-8">
		<header class="space-y-2 text-center">
			<h1 class="text-4xl font-black tracking-tight">LinkMusician</h1>
			<p class="text-muted-foreground">
				Le réseau des musicien·nes et des pros de la musique : trouve avec qui jouer, monte tes
				projets, fais grandir ton parcours.
			</p>
		</header>

		<section
			class="rounded-lg border p-6 shadow-lg backdrop-blur-3xl"
			aria-labelledby="login-title"
		>
			<h2 id="login-title" class="mb-4 text-xl font-semibold">Se connecter</h2>

			<form method="POST" action="/auth/login?/login" use:enhance class="space-y-4">
				<Form.Field name="email" form={loginForm}>
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Email</Form.Label>
							<Input
								{...props}
								type="email"
								name="email"
								autocomplete="email"
								bind:value={$loginData.email}
								required
							/>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field name="password" form={loginForm}>
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Mot de passe</Form.Label>
							<Input
								{...props}
								type="password"
								name="password"
								autocomplete="current-password"
								bind:value={$loginData.password}
								required
							/>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Button type="submit" class="w-full" disabled={$submitting}>Se connecter</Button>
				<Button type="button" variant="outline" class="w-full" onclick={signInWithGoogle}>
					Continuer avec Google
				</Button>
			</form>

			<div class="mt-4 flex justify-between text-sm">
				<a href="/auth/signup" class="underline">Créer un compte</a>
				<a href="/auth/forgot-password" class="underline">Mot de passe oublié ?</a>
			</div>
		</section>
	</div>
</div>
