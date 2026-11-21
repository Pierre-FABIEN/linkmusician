<script lang="ts">
	// LINKMUSICIAN: carnet de contacts volontaire (D82) : enregistrer un acteur
	// sans lui écrire, sans le prévenir, et le retirer librement.
	import { enhance } from '$app/forms';
	import { BookmarkCheck, BookmarkPlus } from 'lucide-svelte';

	let { saved, name }: { saved: boolean; name: string } = $props();
</script>

{#if saved}
	<form
		method="POST"
		action="?/unsaveContact"
		use:enhance
		class="inline-flex flex-wrap items-center gap-2"
	>
		<span class="inline-flex items-center gap-1 text-sm font-semibold text-primary">
			<BookmarkCheck class="size-4" aria-hidden="true" /> Dans tes contacts
		</span>
		<button class="min-h-11 text-sm underline">Retirer de mes contacts</button>
	</form>
{:else}
	<form method="POST" action="?/saveContact" use:enhance>
		<button class="lm-btn gap-2" data-variant="ghost" aria-label="Ajouter {name} à mes contacts">
			<BookmarkPlus class="size-4" aria-hidden="true" /> Ajouter à mes contacts
		</button>
	</form>
{/if}
<p class="text-xs text-muted-foreground">
	Ton carnet est privé : {name} n’est pas prévenu·e et n’obtient aucun accès.
</p>
