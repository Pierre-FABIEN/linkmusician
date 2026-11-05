<script lang="ts">
	// LINKMUSICIAN: « bientôt » (P0-05b) ; construit par P2-04 et P2-05.
	import ComingSoon from '#lib/components/linkmusician/ComingSoon.svelte';
</script>

<ComingSoon
	title="Messages"
	pitch="Échange avec les musicien·nes que tu rencontres, en toute sécurité."
	features={[
		'Demandes de contact, puis conversations',
		'Blocage et signalement à portée de main',
		'Un premier échange réciproque te fait gagner des points'
	]}
	meanwhile={[
		{ href: '/profil/ville', label: 'Indiquer ma ville' },
		{ href: '/reglages', label: 'Voir mes réglages' }
	]}
/>
