<script lang="ts">
	// LINKMUSICIAN: onboarding, étape d'un métier (ONB-02), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import TrackStepForm from '#lib/components/linkmusician/onboarding/TrackStepForm.svelte';

	let { data } = $props();
</script>

<SEO title={`Ton métier : ${data.label}`} noindex nofollow />

{#key data.track}
	<TrackStepForm {data} />
{/key}
