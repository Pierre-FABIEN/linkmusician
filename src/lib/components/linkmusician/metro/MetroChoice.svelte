<script lang="ts" generics="V extends string">
	/**
	 * LINKMUSICIAN: choix court en boutons bascules (D55, `docs/design` §4.6),
	 * plutôt qu'un `select` : créneau, type, quelques options. Chaque option
	 * est un bouton `aria-pressed` ; avec `name`, la valeur part aussi dans
	 * le formulaire (champ caché).
	 */
	let {
		options,
		value = $bindable(),
		label,
		name
	}: {
		options: readonly { value: V; label: string }[];
		value?: V;
		/** Nom du groupe, lu par les lecteurs d'écran. */
		label: string;
		name?: string;
	} = $props();
</script>

<div class="lm-choice" role="group" aria-label={label}>
	{#each options as option (option.value)}
		<button
			type="button"
			class="lm-choice__option"
			aria-pressed={value === option.value}
			onclick={() => (value = option.value)}>{option.label}</button
		>
	{/each}
	{#if name}<input type="hidden" {name} value={value ?? ''} />{/if}
</div>
