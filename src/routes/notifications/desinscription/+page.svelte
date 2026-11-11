<script lang="ts">
	// LINKMUSICIAN: désinscription du digest email (P2-09b), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	const topic = $derived(form?.done ? form.topic : data.topic);
	import MetroPage from '#lib/components/linkmusician/metro/MetroPage.svelte';
</script>

<SEO title="Emails de LinkMusician" noindex nofollow />

<MetroPage>
	<div class="min-h-screen w-screen px-4 py-24 ccc">
		<div class="lm-tile lm-tile--flow max-w-md space-y-4 p-6 text-center">
			{#if form?.done}
				<h1 class="lm-title lm-title--sm">C’est fait</h1>
				<p>
					{#if topic}
						Tu ne recevras plus d’email pour : {topic.toLowerCase()}.
					{:else}
						Tu ne recevras plus nos emails de nouveautés.
					{/if}
				</p>
				<p class="text-sm text-muted-foreground">
					Tu peux changer d’avis à tout moment dans
					<a href="/reglages#notifications" class="underline">tes réglages</a>.
				</p>
			{:else if data.token}
				<h1 class="lm-title lm-title--sm">Moins d’emails ?</h1>
				<p>
					{#if data.topic}
						Ne plus recevoir d’email pour : {data.topic.toLowerCase()}.
					{:else}
						Ne plus recevoir aucun email de nouveautés.
					{/if}
					Les notifications restent visibles dans l’app.
				</p>
				<form method="POST" use:enhance>
					<input type="hidden" name="t" value={data.token} />
					<button
						type="submit"
						class="lm-btn"
						>Confirmer</button
					>
				</form>
				{#if form?.error}<p role="alert" class="text-sm text-red-700">{form.error}</p>{/if}
			{:else}
				<h1 class="lm-title lm-title--sm">Lien plus valide</h1>
				<p class="text-sm text-muted-foreground">
					Connecte-toi pour choisir ce que tu reçois, dans
					<a href="/reglages#notifications" class="underline">tes réglages</a>.
				</p>
			{/if}
		</div>
	</div>
</MetroPage>
