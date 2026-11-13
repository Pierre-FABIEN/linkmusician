<script lang="ts">
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	let { form } = $props();
</script>

<SEO title="Créer une agence" noindex nofollow />
<div class="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-24">
	<MetroPageHeader
		title="Créer une agence"
		intro="Une équipe privée, distincte de tes accompagnements d’artistes."
	/>
	<p>
		Chaque personne accepte son invitation. Rejoindre l’agence ne donne aucun mandat sur un artiste
		ni pouvoir de signature.
	</p>
	{#if form?.error}<p role="alert">{form.error}</p>{/if}
	<form method="POST" use:enhance class="space-y-4">
		<label class="block space-y-2"
			>Nom de l’agence<input
				name="name"
				required
				minlength="3"
				maxlength="80"
				class="lm-field block w-full"
			/></label
		>
		<button class="lm-btn">Créer l’agence</button>
	</form>
</div>
