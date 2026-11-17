<script lang="ts">
	// LINKMUSICIAN: légende des niveaux de preuve du profil public (ONB-12c3).
	import { PROOF_LEVELS, PROOF_LEVEL_INFO } from '#lib/actors/proofLevels';
	import ProofBadge from './ProofBadge.svelte';
</script>

<section class="space-y-2 text-sm" aria-labelledby="niveaux-preuve" data-testid="legende-preuve">
	<h3 id="niveaux-preuve" class="font-semibold">Déclaré, confirmé, vérifié</h3>
	<dl class="space-y-1">
		{#each PROOF_LEVELS as level (level)}
			<div class="flex flex-wrap items-baseline gap-2">
				<dt><ProofBadge {level} /></dt>
				<dd class="text-muted-foreground">{PROOF_LEVEL_INFO[level].hint}</dd>
			</div>
		{/each}
	</dl>
</section>
