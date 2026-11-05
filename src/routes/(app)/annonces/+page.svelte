<script lang="ts">
	// LINKMUSICIAN: « bientôt » (P0-05b) ; construit par P2-02 et P2-03.
	import ComingSoon from '#lib/components/linkmusician/ComingSoon.svelte';
</script>

<ComingSoon
	title="Annonces"
	pitch="Les quêtes des autres : un groupe cherche une batteuse, une jam cherche une voix."
	features={[
		'Publier une annonce : jam, recrutement, session',
		'Postuler avec un message',
		'Quand vous jouez ensemble, chacun gagne des points'
	]}
	meanwhile={[
		{ href: '/profil', label: 'Dire ce que je recherche' },
		{ href: '/espace', label: 'Voir mes objectifs' }
	]}
/>
