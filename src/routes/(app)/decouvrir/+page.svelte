<script lang="ts">
	// LINKMUSICIAN: « bientôt » (P0-05b) ; construit par P2-01 et le mode jam (P2-13).
	import ComingSoon from '#lib/components/linkmusician/ComingSoon.svelte';
</script>

<ComingSoon
	title="Découvrir"
	pitch="Trouve avec qui jouer près de chez toi, et des jams où aller dès ce soir."
	features={[
		'Recherche par instrument, niveau, genre et distance',
		'« Je suis dispo » : les musicien·nes disponibles autour de toi',
		'Les jams ouvertes à rejoindre'
	]}
	meanwhile={[
		{ href: '/profil/musical', label: 'Compléter mon profil musical' },
		{ href: '/profil/medias', label: 'Publier une démo' }
	]}
/>
