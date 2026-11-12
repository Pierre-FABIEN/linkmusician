<script lang="ts">
	/**
	 * LINKMUSICIAN: panneau contextuel Metro (D55, `docs/design` §4.6) sur un
	 * `<dialog>` natif : feuille en bas sur téléphone, centrée sur grand
	 * écran. Échap ferme, le focus reste dedans et revient au déclencheur.
	 * Pour une action courte (proposer, confirmer, signaler) ; remplace les
	 * dialogues shadcn. Ouvrir et fermer avec `bind:open`.
	 */
	import type { Snippet } from 'svelte';
	import { X } from 'lucide-svelte';

	let {
		open = $bindable(false),
		title,
		children
	}: {
		open?: boolean;
		title: string;
		children: Snippet;
	} = $props();

	let dialog = $state<HTMLDialogElement | null>(null);
	const titleId = `lm-sheet-${Math.random().toString(36).slice(2, 9)}`;

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	class="lm-sheet"
	aria-labelledby={titleId}
	onclose={() => (open = false)}
	onclick={(e) => {
		// Un clic sur le voile (hors du panneau) ferme.
		if (e.target === dialog) open = false;
	}}
>
	<div class="lm-sheet__head">
		<h2 id={titleId} class="lm-sheet__title">{title}</h2>
		<button
			type="button"
			class="lm-action shrink-0"
			aria-label="Fermer"
			onclick={() => (open = false)}
		>
			<X class="size-5" aria-hidden="true" />
		</button>
	</div>
	{@render children()}
</dialog>
