<script lang="ts">
	/**
	 * LINKMUSICIAN: page Metro hors de la coquille (MET-07, D55) : le visiteur
	 * de l'aide, d'un profil public ou d'une démarche, les premiers pas, les
	 * pages de modération et d'erreur. Même papier, même encre, mêmes jetons
	 * que l'espace connecté, sans en-tête de membre.
	 */
	import '#lib/linkmusician/theme.css';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="lm-app lm-metro">{@render children()}</div>
