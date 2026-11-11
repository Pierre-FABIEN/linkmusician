<script lang="ts">
	/**
	 * LINKMUSICIAN: champ Metro (D55, `docs/design` §4.6) : un `label`
	 * visible au-dessus, le champ (`lm-field`), l'aide en petit dessous et
	 * l'erreur en `role="alert"`, reliées par `aria-describedby`. Le champ
	 * lui-même est passé en enfant, qui reçoit les attributs à poser.
	 */
	import type { Snippet } from 'svelte';

	let {
		id,
		label,
		help,
		error,
		optional = false,
		children
	}: {
		id: string;
		label: string;
		help?: string;
		error?: string | string[] | null;
		/** Ajoute « (facultatif) » au libellé. */
		optional?: boolean;
		children: Snippet<
			[
				{
					id: string;
					class: string;
					'aria-describedby': string | undefined;
					'aria-invalid': 'true' | undefined;
				}
			]
		>;
	} = $props();

	const message = $derived(Array.isArray(error) ? error[0] : error);
	const describedBy = $derived(
		[help ? `${id}-aide` : null, message ? `${id}-erreur` : null].filter(Boolean).join(' ') ||
			undefined
	);
</script>

<div class="space-y-1.5">
	<label for={id} class="block font-medium">
		{label}
		{#if optional}<span class="font-normal text-muted-foreground">(facultatif)</span>{/if}
	</label>
	{@render children({
		id,
		class: 'lm-field w-full',
		'aria-describedby': describedBy,
		'aria-invalid': message ? 'true' : undefined
	})}
	{#if help}<p id="{id}-aide" class="text-sm text-muted-foreground">{help}</p>{/if}
	{#if message}<p id="{id}-erreur" role="alert" class="text-sm text-destructive">{message}</p>{/if}
</div>
