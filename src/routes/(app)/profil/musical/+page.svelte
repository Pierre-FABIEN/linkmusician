<script lang="ts">
	// LINKMUSICIAN: « Mon profil musical », voir +page.server.ts.
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { X } from 'lucide-svelte';
	import { Button } from '#shadcn/button';
	import { musicalProfileSchema } from '#lib/schema/skills/musicalProfileSchema';
	import { RETRY_FRIENDLY_FORM } from '#lib/forms/superformOptions';
	import { INSTRUMENT_FAMILY_LABELS } from '#lib/skills/instruments';
	import { INSTRUMENT_LEVELS } from '#lib/skills/levels';
	import { MAX_GENRES, MAX_INFLUENCES, MAX_INSTRUMENTS } from '#lib/skills/profile';
	import SEO from '#lib/components/SEO.svelte';

	let { data } = $props();

	const profileForm = superForm(
		untrack(() => data.form),
		{
			validators: zodClient(musicalProfileSchema),
			id: 'musicalProfileForm',
			dataType: 'json',
			resetForm: false,
			...RETRY_FRIENDLY_FORM,
			onUpdated: ({ form }) => {
				if (form.valid && form.message) toast.success(form.message);
			}
		}
	);
	const { form, errors, enhance, submitting } = profileForm;

	const instrumentNames = $derived(
		new Map(data.families.flatMap((f) => f.instruments.map((i) => [i.id, i.name] as const)))
	);
	const chosenIds = $derived(new Set($form.instruments.map((i) => i.instrumentId)));
	const genresFull = $derived($form.genreIds.length >= MAX_GENRES);

	let toAdd = $state('');

	function addInstrument() {
		if (!toAdd || chosenIds.has(toAdd) || $form.instruments.length >= MAX_INSTRUMENTS) return;
		$form.instruments = [...$form.instruments, { instrumentId: toAdd, level: 0 }];
		if ($form.instruments.length === 1) $form.primaryInstrumentId = toAdd;
		toAdd = '';
	}

	function removeInstrument(id: string) {
		$form.instruments = $form.instruments.filter((i) => i.instrumentId !== id);
		if ($form.primaryInstrumentId === id)
			$form.primaryInstrumentId = $form.instruments[0]?.instrumentId;
	}

	function descriptorOf(level: number) {
		const found = INSTRUMENT_LEVELS.find((l) => l.level === level);
		return found ? `Je peux ${found.descriptor}.` : '';
	}
</script>

<SEO title="Mon profil musical" noindex nofollow />

<div class="min-h-screen w-screen px-4 py-24">
	<div class="mx-auto max-w-2xl space-y-8 rounded-lg border p-6 shadow-lg backdrop-blur-3xl">
		<div>
			<a href="/espace" class="text-sm text-muted-foreground underline">← Mon espace</a>
			<h1 class="mt-2 text-2xl font-bold">Mon profil musical</h1>
			<p class="text-sm text-muted-foreground">
				Ce que tu joues, à quel niveau, et ce qui t'inspire. Les niveaux sont déclarés : ils
				s'affichent toujours avec la mention « déclaré ».
			</p>
		</div>

		<form method="POST" use:enhance class="space-y-10">
			<!-- Instruments -->
			<section aria-labelledby="instruments-title" class="space-y-3">
				<h2 id="instruments-title" class="text-lg font-semibold">
					Instruments <span class="text-sm font-normal text-muted-foreground"
						>({$form.instruments.length}/{MAX_INSTRUMENTS})</span
					>
				</h2>

				<ul class="space-y-3">
					{#each $form.instruments as played, index (played.instrumentId)}
						{@const name = instrumentNames.get(played.instrumentId) ?? '?'}
						<li class="space-y-2 rounded-lg border p-3">
							<div class="flex items-center justify-between gap-2">
								<span class="font-medium">{name}</span>
								<button
									type="button"
									class="rounded p-1 text-muted-foreground hover:text-foreground"
									aria-label="Retirer {name}"
									onclick={() => removeInstrument(played.instrumentId)}
								>
									<X class="size-4" />
								</button>
							</div>
							<select
								class="w-full rounded-md border bg-background p-2 text-sm"
								aria-label="Niveau en {name}"
								bind:value={$form.instruments[index].level}
							>
								<option value={0} disabled>Choisis ton niveau</option>
								{#each INSTRUMENT_LEVELS as level (level.level)}
									<option value={level.level}>{level.level} · {level.label}</option>
								{/each}
							</select>
							{#if played.level}
								<p class="text-sm text-muted-foreground">{descriptorOf(played.level)}</p>
							{/if}
							{#if $form.instruments.length > 1}
								<label class="flex cursor-pointer items-center gap-2 text-sm">
									<input
										type="radio"
										name="primaryInstrumentId"
										value={played.instrumentId}
										class="size-4"
										bind:group={$form.primaryInstrumentId}
									/>
									Mon instrument principal
								</label>
							{/if}
						</li>
					{/each}
				</ul>

				{#if $form.instruments.length < MAX_INSTRUMENTS}
					<div class="flex gap-2">
						<select
							class="flex-1 rounded-md border bg-background p-2 text-sm"
							aria-label="Instrument à ajouter"
							bind:value={toAdd}
							onchange={addInstrument}
						>
							<option value="">+ Ajouter un instrument…</option>
							{#each data.families as { family, instruments } (family)}
								<optgroup label={INSTRUMENT_FAMILY_LABELS[family]}>
									{#each instruments as instrument (instrument.id)}
										<option value={instrument.id} disabled={chosenIds.has(instrument.id)}
											>{instrument.name}</option
										>
									{/each}
								</optgroup>
							{/each}
						</select>
					</div>
				{/if}

				{#if $errors.instruments?._errors}
					<p class="text-sm text-destructive">{$errors.instruments._errors[0]}</p>
				{/if}
				{#if $errors.primaryInstrumentId}
					<p class="text-sm text-destructive">{$errors.primaryInstrumentId[0]}</p>
				{/if}
			</section>

			<!-- Genres -->
			<section aria-labelledby="genres-title" class="space-y-3">
				<h2 id="genres-title" class="text-lg font-semibold">
					Genres <span class="text-sm font-normal text-muted-foreground"
						>({$form.genreIds.length}/{MAX_GENRES})</span
					>
				</h2>
				<p class="text-sm text-muted-foreground">
					Un genre parent (« Rock ») ou un sous-genre précis (« Punk »).
				</p>
				<div class="grid gap-3 sm:grid-cols-2">
					{#each data.genres as genre (genre.id)}
						<fieldset class="rounded-lg border p-3">
							<legend class="sr-only">{genre.name}</legend>
							{#each [genre, ...genre.children] as item, i (item.id)}
								{@const checked = $form.genreIds.includes(item.id)}
								<label
									class="flex cursor-pointer items-center gap-2 py-0.5 text-sm {i === 0
										? 'font-medium'
										: 'pl-5'} {genresFull && !checked ? 'opacity-50' : ''}"
								>
									<input
										type="checkbox"
										value={item.id}
										class="size-4"
										disabled={genresFull && !checked}
										bind:group={$form.genreIds}
									/>
									{item.name}
								</label>
							{/each}
						</fieldset>
					{/each}
				</div>
				{#if $errors.genreIds?._errors}
					<p class="text-sm text-destructive">{$errors.genreIds._errors[0]}</p>
				{/if}
			</section>

			<!-- Influences -->
			<section class="space-y-2">
				<label for="influences" class="block text-lg font-semibold">Influences</label>
				<p class="text-sm text-muted-foreground">
					Artistes, albums, courants : une influence par ligne, {MAX_INFLUENCES} au maximum.
				</p>
				<textarea
					id="influences"
					rows="5"
					class="w-full rounded-md border bg-background p-2 text-sm"
					placeholder="Nina Simone&#10;Radiohead&#10;OK Computer"
					bind:value={$form.influences}
				></textarea>
				{#if $errors.influences}
					<p class="text-sm text-destructive">{$errors.influences[0]}</p>
				{/if}
			</section>

			<Button type="submit" class="w-full" disabled={$submitting}>Enregistrer</Button>
		</form>
	</div>
</div>
