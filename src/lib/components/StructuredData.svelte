<script lang="ts">
	interface StructuredDataProps {
		// LINKMUSICIAN: 'Person' et 'MusicGroup' pour le profil public `/@handle` (P1-11),
		// 'LocalBusiness' pour un studio (P4-03a).
		type:
			| 'Organization'
			| 'WebSite'
			| 'Article'
			| 'Product'
			| 'BreadcrumbList'
			| 'Person'
			| 'MusicGroup'
			| 'LocalBusiness';
		data: Record<string, unknown>;
	}

	let { type, data }: StructuredDataProps = $props();

	// Construire l'objet de données structurées
	const structuredData = $derived({
		'@context': 'https://schema.org',
		'@type': type,
		...data
	});

	// Un élément "script" placé dans le template est parsé en RAWTEXT : les
	// accolades n'y sont jamais interpolées par Svelte. On construit donc la
	// balise nous-mêmes et on l'injecte via {@html}. Les mots-clés sont coupés
	// en deux concaténations ci-dessous : le parser de ce fichier termine son
	// bloc de tête dès qu'il repère la séquence de fermeture correspondante,
	// même à l'intérieur d'un template string ou d'un commentaire JS.
	const SCRIPT_OPEN = '<scr' + 'ipt type="application/ld+json">';
	const SCRIPT_CLOSE = '</scr' + 'ipt>';
	// Tout signe "inférieur à" des données est encodé en \u003c (JSON valide)
	// pour empêcher qu'une valeur ne referme la balise injectée prématurément
	// côté navigateur.
	const structuredDataScript = $derived(
		SCRIPT_OPEN + JSON.stringify(structuredData).replace(/</g, '\\u003c') + SCRIPT_CLOSE
	);
</script>

<svelte:head>
	{@html structuredDataScript}
</svelte:head>
