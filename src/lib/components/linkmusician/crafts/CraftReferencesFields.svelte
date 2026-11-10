<script lang="ts">
	// LINKMUSICIAN: travaux en écoute d'un profil de métier (P4-02, P4-04),
	// partagés par « Mon profil d'ingé son » et « Mon profil de producteur·rice ».
	import { Plus, X } from 'lucide-svelte';
	import { MAX_REFERENCES } from '#lib/crafts/common';

	type Row = { title: string; url: string };
	type RowErrors = { title?: string[]; url?: string[] };

	let {
		references = $bindable(),
		errors,
		title,
		hint,
		titlePlaceholder,
		addLabel
	}: {
		references: Row[];
		errors?: { _errors?: string[] } & Record<number, RowErrors | undefined>;
		title: string;
		hint: string;
		titlePlaceholder: string;
		addLabel: string;
	} = $props();

	const filled = $derived(references.filter((r) => r.url.trim()).length);
</script>

<section class="space-y-3" aria-labelledby="references-title">
	<h2 id="references-title" class="text-lg font-semibold">
		{title}
		<span class="text-sm font-normal text-muted-foreground">({filled}/{MAX_REFERENCES})</span>
	</h2>
	<p class="text-sm text-muted-foreground">{hint}</p>
	<ul class="space-y-3">
		{#each references as _, i (i)}
			<li class="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_1.4fr_auto]">
				<label class="space-y-1 text-sm">
					<span class="font-medium">Titre</span>
					<input
						class="w-full rounded-md border bg-background p-2"
						placeholder={titlePlaceholder}
						bind:value={references[i].title}
					/>
					{#if errors?.[i]?.title}
						<span class="block text-destructive">{errors[i]?.title?.[0]}</span>
					{/if}
				</label>
				<label class="space-y-1 text-sm">
					<span class="font-medium">Lien</span>
					<input
						type="text"
						inputmode="url"
						class="w-full rounded-md border bg-background p-2"
						placeholder="soundcloud.com/…"
						bind:value={references[i].url}
					/>
					{#if errors?.[i]?.url}
						<span class="block text-destructive">{errors[i]?.url?.[0]}</span>
					{/if}
				</label>
				<button
					type="button"
					class="flex min-h-11 items-center justify-center self-end rounded-md border px-3 text-muted-foreground hover:bg-muted"
					aria-label="Retirer"
					onclick={() => (references = references.filter((_, k) => k !== i))}
				>
					<X class="size-4" aria-hidden="true" />
				</button>
			</li>
		{/each}
	</ul>
	{#if references.length < MAX_REFERENCES}
		<button
			type="button"
			class="flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium hover:bg-muted"
			onclick={() => (references = [...references, { title: '', url: '' }])}
		>
			<Plus class="size-4" aria-hidden="true" />
			{addLabel}
		</button>
	{/if}
	{#if errors?._errors}
		<p class="text-sm text-destructive">{errors._errors[0]}</p>
	{/if}
</section>
