<script lang="ts">
	/**
	 * LINKMUSICIAN: « Plus tard » et « Pas pour moi » d'une prochaine action
	 * (N4, conception 21 §8.6), partagés par le héros et la liste. Le serveur
	 * revérifie la clé et le rang ; ici, seulement les boutons et le message.
	 */
	import { enhance, type SubmitFunction } from '$app/forms';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	let {
		key,
		title,
		postpone = false,
		decline = false
	}: { key: string; title: string; postpone?: boolean; decline?: boolean } = $props();

	let pending = $state(false);
	const choose: SubmitFunction = () => {
		pending = true;
		return async ({ result, update }) => {
			pending = false;
			if (result.type === 'success' && typeof result.data?.message === 'string')
				toast.success(result.data.message, {
					action: { label: 'Mes choix', onClick: () => goto('/espace/propositions') }
				});
			else if (result.type === 'failure')
				toast.error(String(result.data?.choiceError ?? 'Ce choix n’a pas pu être enregistré.'));
			await update();
		};
	};
</script>

{#if postpone || decline}
	<div class="flex flex-wrap gap-2">
		{#if postpone}
			<form method="POST" action="/espace?/later" use:enhance={choose}>
				<input type="hidden" name="key" value={key} />
				<button
					class="lm-btn min-h-11"
					data-variant="ghost"
					disabled={pending}
					aria-label="Plus tard : {title}">Plus tard</button
				>
			</form>
		{/if}
		{#if decline}
			<form method="POST" action="/espace?/notForMe" use:enhance={choose}>
				<input type="hidden" name="key" value={key} />
				<button
					class="lm-btn min-h-11"
					data-variant="ghost"
					disabled={pending}
					aria-label="Pas pour moi : {title}">Pas pour moi</button
				>
			</form>
		{/if}
	</div>
{/if}
