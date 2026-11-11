<script lang="ts">
	// LINKMUSICIAN: accueil public (P0-05c) : présentation et connexion, voir
	// +page.server.ts. Pas de liste d'attente : pas de bêta (D23).
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
	import '#lib/linkmusician/theme.css';
	import { BRAND } from '#lib/linkmusician/brand';
	import { Trophy, Guitar, Users, Mic2, Disc3 } from 'lucide-svelte';

	const modes = [
		{
			icon: Trophy,
			title: 'Mode carrière',
			text: 'Monte ton groupe, enregistre, joue sur scène, sors ta musique : chaque étape réelle fait avancer ta carrière.'
		},
		{
			icon: Guitar,
			title: 'Mode jam',
			text: 'Envie de jouer ce soir ? Trouve des musicien·nes dispos près de chez toi et fais des rencontres.'
		}
	];
	const steps = [
		{ icon: Users, text: 'Rencontre des musicien·nes près de chez toi' },
		{ icon: Disc3, text: 'Crée des morceaux, enregistre avec des pros' },
		{ icon: Mic2, text: 'Monte sur scène, et tout ce que tu fais compte' }
	];

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
	import MetroPage from '#lib/components/linkmusician/metro/MetroPage.svelte';
</script>

<SEO pageKey="home" />

<MetroPage>
	<div class="min-h-screen w-screen px-4 py-24">
		<div class="mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-[1fr_24rem]">
			<header class="space-y-8">
				<div class="space-y-4">
					<h1 class="lm-display bg-[image:var(--lm-gradient)] bg-clip-text pb-2 text-transparent">
						{BRAND.name}
					</h1>
					<p class="lm-title lm-title--sm">{BRAND.tagline}</p>
					<p class="max-w-prose text-muted-foreground">
						La plateforme des musicien·nes et des pros de la musique : trouve avec qui jouer, monte
						tes projets, et vois ton parcours grandir.
					</p>
					<a href="/auth/signup" class="lm-btn">Créer un compte</a>
				</div>

				<ul class="grid gap-4 sm:grid-cols-2" aria-label="Deux façons de jouer">
					{#each modes as m (m.title)}
						<li class="lm-tile lm-tile--flow space-y-2 p-5">
							<m.icon class="size-6 text-primary" aria-hidden="true" />
							<h2 class="text-lg font-bold">{m.title}</h2>
							<p class="text-sm text-muted-foreground">{m.text}</p>
						</li>
					{/each}
				</ul>

				<ol class="space-y-3" aria-label="Comment ça marche">
					{#each steps as s, i (s.text)}
						<li class="flex items-center gap-3">
							<span
								class="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground"
								>{i + 1}</span
							>
							<s.icon class="size-5 text-muted-foreground" aria-hidden="true" />
							<span>{s.text}</span>
						</li>
					{/each}
				</ol>
			</header>

			<section class="lm-tile lm-tile--flow p-6" aria-labelledby="login-title">
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
</MetroPage>
