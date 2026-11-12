<script lang="ts">
	// LINKMUSICIAN: page d'un métier (D59), voir +page.server.ts.
	import { Button } from '#shadcn/button';
	import SEO from '#lib/components/SEO.svelte';
	import TrackStepForm from '#lib/components/linkmusician/onboarding/TrackStepForm.svelte';

	import TrackCompletenessCard from '#lib/components/linkmusician/profile/TrackCompletenessCard.svelte';
	import TrackSettingsForm from '#lib/components/linkmusician/profile/TrackSettingsForm.svelte';

	let { data } = $props();
</script>

<SEO title={data.held ? data.label : 'Métier'} noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-8">
		<a href="/profil" class="text-sm text-muted-foreground underline">← Mon profil</a>
		{#if data.held}
			{#key data.track}
				<TrackStepForm {data}>
					{#snippet heading()}
						<div>
							<h1 class="lm-title">{data.label}</h1>
							<p class="text-sm text-muted-foreground">{data.description}</p>
							{#if data.profilePath}
								<p class="mt-1 text-sm">
									Matériel, travaux en écoute, tarifs :
									<a href={data.profilePath} class="underline">ta fiche détaillée</a>.
								</p>
							{/if}
						</div>
						<TrackCompletenessCard completeness={data.completeness} common={data.commonMissing} />
					{/snippet}
					{#snippet actions({ missing, submitting })}
						<Button type="submit" disabled={submitting || missing}>Enregistrer</Button>
					{/snippet}
				</TrackStepForm>
			{/key}
			<TrackSettingsForm
				slug={data.settingsSlug}
				settings={data.settings}
				saved={data.settingsSaved}
			/>
		{:else}
			<h1 class="lm-title">Ce métier n’est pas le tien</h1>
			<p class="text-sm text-muted-foreground">Ajoute-le pour remplir cette page.</p>
			<a href="/reglages/metiers" class="lm-btn">Choisir mes métiers</a>
		{/if}
	</div>
</div>
