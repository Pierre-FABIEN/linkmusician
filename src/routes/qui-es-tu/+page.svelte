<script lang="ts">
	// LINKMUSICIAN: choix des métiers à l'arrivée, voir +page.server.ts.
	import { untrack } from 'svelte';
	import { Button } from '#shadcn/button';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { tracksSchema } from '#lib/schema/actors/tracksSchema';
	import { RETRY_FRIENDLY_FORM } from '#lib/forms/superformOptions';
	import TrackPicker from '#lib/components/linkmusician/TrackPicker.svelte';
	import SEO from '#lib/components/SEO.svelte';

	let { data } = $props();

	const tracksForm = superForm(
		untrack(() => data.form),
		{ validators: zodClient(tracksSchema), id: 'tracksForm', ...RETRY_FRIENDLY_FORM }
	);
	const { enhance, submitting } = tracksForm;
</script>

<SEO title="Qui es-tu ?" noindex nofollow />

<div class="min-h-screen w-screen px-4 py-24">
	<div class="mx-auto max-w-lg rounded-lg border p-6 shadow-lg backdrop-blur-3xl">
		<h1 class="mb-2 text-2xl font-bold">Qui es-tu&nbsp;?</h1>
		<p class="mb-6 text-sm text-muted-foreground">
			Coche tout ce que tu fais dans la musique, puis ton métier principal. Les métiers marqués «
			bientôt » ont pour l'instant un profil de base : dis-nous que tu es là, on les construit. Tu
			pourras changer d'avis dans tes réglages.
		</p>

		<form method="POST" use:enhance class="space-y-4">
			<TrackPicker form={tracksForm} />
			<Button type="submit" class="w-full" disabled={$submitting}>Continuer</Button>
		</form>
	</div>
</div>
