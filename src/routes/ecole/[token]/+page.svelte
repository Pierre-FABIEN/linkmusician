<script lang="ts">
	// LINKMUSICIAN: lien d'invitation d'une école (P5-11), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';

	let { data, form } = $props();
	const btn = 'inline-flex min-h-11 items-center justify-center rounded-full px-5 font-semibold';
</script>

<SEO title="Rejoindre {data.name}" noindex nofollow />

<main class="min-h-screen w-full px-4 py-16">
	<div class="mx-auto max-w-lg space-y-5 rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
		<p class="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
			Invitation d’école
		</p>
		<h1 class="text-3xl font-black tracking-tight">Rejoindre {data.name}</h1>
		{#if data.error}
			<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
				{data.error}
			</p>
		{:else}
			<p class="text-muted-foreground">
				Ton école t’invite sur LinkMusician : tu verras ses ateliers jam, réservés à ses élèves, et
				tu pourras ensuite rejoindre les jams publiques autour de toi.
			</p>
			{#if form?.error}
				<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
					{form.error}
				</p>
			{/if}
			{#if data.ready}
				<form method="POST" use:enhance>
					<button class="{btn} w-full bg-primary text-primary-foreground">Rejoindre l’école</button>
				</form>
			{:else if data.signedIn}
				<p class="text-sm">Termine d’abord ton inscription : tu reviendras ici ensuite.</p>
				<a href="/demarrer" class="{btn} w-full bg-primary text-primary-foreground">Continuer</a>
			{:else}
				<div class="grid gap-2 sm:grid-cols-2">
					<a href="/auth/signup" class="{btn} bg-primary text-primary-foreground"
						>Créer mon compte</a
					>
					<a href="/auth/login" class="{btn} border hover:bg-muted">J’ai déjà un compte</a>
				</div>
				<p class="text-sm text-muted-foreground">
					Après l’inscription, on te ramène ici pour rejoindre l’école.
				</p>
			{/if}
		{/if}
	</div>
</main>
