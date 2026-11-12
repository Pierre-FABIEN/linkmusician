<script lang="ts">
	// LINKMUSICIAN: « Ma pratique de musicien·ne » (ONB-03), voir +page.server.ts.
	import { Button } from '#shadcn/button';
	import SEO from '#lib/components/SEO.svelte';
	import MusicianStepForm from '#lib/components/linkmusician/musician/MusicianStepForm.svelte';

	let { data } = $props();
</script>

<SEO title="Ma pratique" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-8">
		<div>
			<a href="/profil" class="text-sm text-muted-foreground underline">← Mon profil</a>
			<h1 class="lm-title mt-2">Ma pratique</h1>
			<p class="text-sm text-muted-foreground">
				Où tu en es, ce que tu cherches et ce que tu proposes comme musicien·ne. Tout est
				déclaratif.
			</p>
		</div>
		{#if data.hasTrack}
			<MusicianStepForm
				form={data.form}
				offers={data.offers}
				needs={data.needs}
				writing={data.writing}
				detailGroupIds={data.detailGroupIds}
			>
				{#snippet actions({ submitting })}
					<Button type="submit" disabled={submitting}>Enregistrer</Button>
				{/snippet}
			</MusicianStepForm>
		{:else}
			<div class="space-y-3">
				<p class="text-sm text-muted-foreground">
					Cette page est celle des musicien·nes. Ajoute ce métier pour la remplir.
				</p>
				<a href="/reglages/metiers" class="lm-btn">Choisir mes métiers</a>
			</div>
		{/if}
	</div>
</div>
