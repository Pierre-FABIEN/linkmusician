<script lang="ts">
	// LINKMUSICIAN: retour vers l'annonce qui a invité à compléter ce champ
	// (ONB-12c3). `?annonce=` n'accepte qu'un identifiant, jamais une adresse.
	import { page } from '$app/state';
	import { annonceReturnHref } from '#lib/opportunities/qualification';

	const href = $derived(annonceReturnHref(page.url.searchParams.get('annonce')));
</script>

{#if href}
	<p class="lm-tile lm-tile--flow p-3 text-sm" data-testid="retour-annonce">
		Une fois enregistré, <a {href} class="font-semibold underline">reviens à l’annonce</a> pour candidater.
	</p>
{/if}
