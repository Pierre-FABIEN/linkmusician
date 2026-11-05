<script lang="ts">
	// LINKMUSICIAN: modification des métiers, voir +page.server.ts.
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
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
		{
			validators: zodClient(tracksSchema),
			id: 'tracksSettingsForm',
			resetForm: false,
			invalidateAll: true,
			...RETRY_FRIENDLY_FORM,
			onUpdated: ({ form }) => {
				if (form.valid && form.message) toast.success(form.message);
			}
		}
	);
	const { enhance, submitting } = tracksForm;
</script>

<SEO title="Mes métiers" noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<div class="mx-auto max-w-lg rounded-lg border p-6 shadow-lg backdrop-blur-3xl">
		<a href="/espace" class="text-sm text-muted-foreground underline">← Mon espace</a>
		<h1 class="mt-2 mb-2 text-2xl font-bold">Mes métiers</h1>
		<p class="mb-6 text-sm text-muted-foreground">
			Au moins un métier, dont un principal : c'est lui qui s'affiche en premier sur ton profil.
		</p>

		<form method="POST" use:enhance class="space-y-4">
			<TrackPicker form={tracksForm} />
			<Button type="submit" class="w-full" disabled={$submitting}>Enregistrer</Button>
		</form>
	</div>
</div>
