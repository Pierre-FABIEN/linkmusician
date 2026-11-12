<script lang="ts">
	import { page } from '$app/state';
	import SEO from '#lib/components/SEO.svelte';
	// LINKMUSICIAN: page d'erreur en Metro (MET-07, D55).
	import MetroPage from '#lib/components/linkmusician/metro/MetroPage.svelte';

	// Le statut était codé en dur à « 404 » : une panne serveur s'affichait donc
	// comme une page introuvable, envoyant l'utilisateur chercher une faute
	// d'URL au lieu de réessayer ou de nous contacter.
	const status = $derived(page.status);
	const isNotFound = $derived(status === 404);
	const message = $derived(
		isNotFound
			? "Cette page n'existe pas ou a été déplacée."
			: 'Une erreur est survenue de notre côté. Réessayez dans un instant ; si le problème persiste, contactez-nous.'
	);
</script>

<!-- SEO pour la page d'erreur -->
<SEO pageKey="error" />

<!-- LINKMUSICIAN: papier, titre et boutons Metro (MET-07). -->
<MetroPage>
	<div class="flex min-h-screen items-center justify-center">
		<div class="max-w-md space-y-4 px-4 text-center">
			<h1 class="lm-display">{status}</h1>
			<p class="text-lg text-muted-foreground">{message}</p>
			<div class="flex flex-wrap items-center justify-center gap-3 pt-2">
				<a href="/" class="lm-btn">Retour à l'accueil</a>
				{#if !isNotFound}
					<a href="/contact" class="lm-btn" data-variant="ghost">Contacter le support</a>
				{/if}
			</div>
		</div>
	</div>
</MetroPage>
