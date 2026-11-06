<script lang="ts">
	// LINKMUSICIAN: désinscription du digest email (P2-09b), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	const topic = $derived(form?.done ? form.topic : data.topic);
</script>

<SEO title="Emails de LinkMusician" noindex nofollow />

<div class="min-h-screen w-screen px-4 py-24 ccc">
	<div class="max-w-md space-y-4 rounded-2xl border p-6 text-center">
		{#if form?.done}
			<h1 class="text-2xl font-bold">C’est fait</h1>
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
			<h1 class="text-2xl font-bold">Moins d’emails ?</h1>
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
					class="min-h-11 rounded-full bg-primary px-5 font-semibold text-primary-foreground"
					>Confirmer</button
				>
			</form>
			{#if form?.error}<p role="alert" class="text-sm text-red-700">{form.error}</p>{/if}
		{:else}
			<h1 class="text-2xl font-bold">Lien plus valide</h1>
			<p class="text-sm text-muted-foreground">
				Connecte-toi pour choisir ce que tu reçois, dans
				<a href="/reglages#notifications" class="underline">tes réglages</a>.
			</p>
		{/if}
	</div>
</div>
