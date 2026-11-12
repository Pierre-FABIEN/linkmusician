<script lang="ts">
	import SEO from '#lib/components/SEO.svelte';
	// LINKMUSICIAN: les pages de compte prennent le papier et les jetons Metro
	// (MET-07, Q40) ; leur logique ne change pas.
	import MetroPage from '#lib/components/linkmusician/metro/MetroPage.svelte';

	let { children } = $props();
</script>

<!-- Aucune page sous /auth n'a de valeur SEO : ce sont soit des flux
     fonctionnels (connexion, inscription, mot de passe...), soit des pages
     privées une fois connecté (compte, paramètres). `noindex` posé une
     seule fois ici plutôt que de compter sur chaque sous-page, actuelle ou
     future, pour y penser. -->
<SEO noindex nofollow />

<!-- LINKMUSICIAN: MetroPage (MET-07, Q40). -->
<MetroPage>{@render children()}</MetroPage>
