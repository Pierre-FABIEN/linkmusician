<script lang="ts">
	// LINKMUSICIAN: niveau de preuve d'une information (ONB-12c3) : un mot,
	// pas une couleur seule ; la légende du profil donne la définition.
	import { PROOF_LEVEL_INFO, type ProofLevel } from '#lib/actors/proofLevels';

	let { level }: { level: ProofLevel } = $props();
</script>

<span
	class="inline-flex items-center rounded border px-1.5 py-0.5 align-middle text-xs font-medium text-muted-foreground"
	data-preuve={level}>{PROOF_LEVEL_INFO[level].label}</span
>
