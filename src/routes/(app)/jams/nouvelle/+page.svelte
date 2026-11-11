<script lang="ts">
	// LINKMUSICIAN: publier une jam (P2-14b), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import { MAX_SPOTS_PER_INSTRUMENT } from '#lib/jam/publicJam';

	let { data, form } = $props();

	// Instruments choisis pour les places (une ligne chacun).
	// « Rejouer ensemble » (P2-15b) : valeurs reprises de la dernière jam.
	// svelte-ignore state_referenced_locally
	const again = data.again;
	const againCount = new Map((again?.spots ?? []).map((s) => [s.slug, s.count]));
	let picked = $state<string[]>(again?.spots.map((s) => s.slug) ?? []);
	let toAdd = $state('');
	const nameOf = (slug: string) => data.instruments.find((i) => i.slug === slug)?.name ?? slug;
	function addSpot() {
		if (toAdd && !picked.includes(toAdd)) picked = [...picked, toAdd];
		toAdd = '';
	}
</script>

<SEO title="Publier une jam" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-5xl space-y-6">
		<div class="space-y-2">
			<a href="/jam" class="text-sm text-muted-foreground underline">← Mode jam</a>
			<h1 class="lm-title">
				{again ? 'Rejouer ensemble' : 'Publier une jam'}
			</h1>
			{#if again}
				<p class="rounded-md border border-primary/50 bg-primary/5 p-3 text-sm">
					Tout est repris de « {again.title} » : choisis juste le jour. Une fois la jam publiée, invite
					celles et ceux avec qui tu veux rejouer.
				</p>
			{/if}
			<p class="text-sm text-muted-foreground">
				Dans un lieu public ou professionnel de l’annuaire, jamais chez quelqu’un. Les musicien·nes
				autour disent « Je viens », sans attendre ton accord.
			</p>
		</div>

		{#if form?.error}
			<p role="alert" class="lm-alert p-3 text-sm">
				{form.error}
			</p>
		{/if}

		{#if data.venues.length === 0}
			<p class="rounded-md border p-3 text-sm">
				Aucun lieu de l’annuaire autour de toi.
				<a href="/lieux/nouveau" class="font-semibold underline">Ajoute d’abord le lieu</a>.
			</p>
		{:else}
			<form method="POST" use:enhance class="space-y-4">
				<label class="block space-y-1 font-medium">
					Lieu
					<select name="venueId" required class="lm-field w-full">
						<option value="">—</option>
						{#each data.venues as v (v.id)}
							<option value={v.id} selected={(form?.values?.venueId ?? data.venueId) === v.id}
								>{v.label}</option
							>
						{/each}
					</select>
					<a href="/lieux/nouveau" class="text-sm font-normal underline">Le lieu n’y est pas ?</a>
					<span class="block text-sm font-normal text-muted-foreground"
						>Le matériel du lieu est repris : tu pourras l’ajuster sur la fiche de la jam.</span
					>
				</label>
				<label class="block space-y-1 font-medium">
					Titre
					<input
						name="title"
						required
						maxlength="80"
						value={form?.values?.title ?? again?.title ?? ''}
						placeholder="Bœuf funk du jeudi"
						class="lm-field w-full"
					/>
				</label>
				<div class="grid gap-3 sm:grid-cols-3">
					<label class="col-span-full block space-y-1 font-medium sm:col-span-1">
						Jour
						<input
							type="date"
							name="day"
							required
							min={data.today}
							value={form?.values?.day ?? data.today}
							class="lm-field w-full"
						/>
					</label>
					<label class="block space-y-1 font-medium">
						Début
						<input
							type="time"
							name="start"
							required
							value={form?.values?.start ?? again?.start ?? '20:00'}
							class="lm-field w-full"
						/>
					</label>
					<label class="block space-y-1 font-medium">
						Fin
						<input
							type="time"
							name="end"
							required
							value={form?.values?.end ?? again?.end ?? '23:00'}
							class="lm-field w-full"
						/>
					</label>
				</div>
				<label class="block space-y-1 font-medium">
					Style (facultatif)
					<select name="genre" class="lm-field w-full">
						<option value="">Tous styles</option>
						{#each data.genres as g (g.slug)}
							<option value={g.slug} selected={(form?.values?.genre ?? again?.genre) === g.slug}
								>{g.name}</option
							>
						{/each}
					</select>
				</label>

				<fieldset class="space-y-2">
					<legend class="font-medium">Places souhaitées (facultatif)</legend>
					{#each picked as slug (slug)}
						<label class="flex items-center justify-between gap-2 text-sm">
							{nameOf(slug)}
							<input
								type="number"
								name="spot-{slug}"
								min="0"
								max={MAX_SPOTS_PER_INSTRUMENT}
								value={againCount.get(slug) ?? 1}
								class="lm-field w-20"
							/>
						</label>
					{/each}
					<div class="flex gap-2">
						<label for="spot-add" class="sr-only">Instrument à ajouter</label>
						<select id="spot-add" bind:value={toAdd} class="lm-field flex-1">
							<option value="">Choisir un instrument</option>
							{#each data.instruments.filter((i) => !picked.includes(i.slug)) as i (i.slug)}
								<option value={i.slug}>{i.name}</option>
							{/each}
						</select>
						<button type="button" onclick={addSpot} class="rounded-md border px-3 text-sm"
							>Ajouter</button
						>
					</div>
				</fieldset>

				<label class="block space-y-1 font-medium">
					Infos (facultatif)
					<textarea
						name="description"
						rows="3"
						maxlength="1000"
						placeholder="Ampli basse et batterie sur place, viens avec ta guitare."
						class="lm-field w-full"
						>{form?.values?.description ?? again?.description ?? ''}</textarea
					>
				</label>
				<button type="submit" class="lm-btn w-full">Publier la jam</button>
			</form>
		{/if}
	</div>
</div>
