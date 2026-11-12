<script lang="ts">
	// LINKMUSICIAN: publier un atelier d'école (P5-11), voir +page.server.ts. Repris de
	// « Publier une jam » (`/jams/nouvelle`).
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import { MAX_SPOTS_PER_INSTRUMENT } from '#lib/jam/publicJam';

	let { data, form } = $props();

	// Instruments choisis pour les places (une ligne chacun).
	let picked = $state<string[]>([]);
	let toAdd = $state('');
	const nameOf = (slug: string) => data.instruments.find((i) => i.slug === slug)?.name ?? slug;
	function addSpot() {
		if (toAdd && !picked.includes(toAdd)) picked = [...picked, toAdd];
		toAdd = '';
	}
</script>

<SEO title="Publier un atelier" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-5xl space-y-6 rounded-3xl border bg-card p-5 shadow-sm sm:p-8 lg:p-10">
		<div class="space-y-2">
			<a href="/ecoles/{data.school.handle}" class="text-sm text-muted-foreground underline"
				>← {data.school.name}</a
			>
			<h1 class="text-3xl font-black tracking-tight sm:text-4xl">Publier un atelier</h1>
			<p class="text-sm text-muted-foreground">
				Un atelier jam de l’école, que seuls tes élèves voient. Tu en es le lead. Pour les élèves
				mineur·es, il doit finir avant 22 h.
			</p>
		</div>

		{#if form?.error}
			<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
				{form.error}
			</p>
		{/if}

		{#if data.venues.length === 0}
			<p class="rounded-md border p-3 text-sm">
				Aucun lieu de l’annuaire autour de toi (ta ville dans « Mon profil »).
				<a href="/lieux/nouveau" class="font-semibold underline">Ajoute d’abord le lieu</a>.
			</p>
		{:else}
			<form method="POST" use:enhance class="space-y-4">
				<label class="block space-y-1 font-medium">
					Lieu
					<select
						name="venueId"
						required
						class="w-full rounded-md border bg-background p-2 text-sm font-normal"
					>
						<option value="">—</option>
						{#each data.venues as v (v.id)}
							<option value={v.id} selected={form?.values?.venueId === v.id}>{v.label}</option>
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
						value={form?.values?.title ?? ''}
						placeholder="Atelier jam des élèves de guitare"
						class="w-full rounded-md border bg-background p-2 text-sm font-normal"
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
							class="w-full rounded-md border bg-background p-2 text-sm font-normal"
						/>
					</label>
					<label class="block space-y-1 font-medium">
						Début
						<input
							type="time"
							name="start"
							required
							value={form?.values?.start ?? '18:00'}
							class="w-full rounded-md border bg-background p-2 text-sm font-normal"
						/>
					</label>
					<label class="block space-y-1 font-medium">
						Fin
						<input
							type="time"
							name="end"
							required
							value={form?.values?.end ?? '20:00'}
							class="w-full rounded-md border bg-background p-2 text-sm font-normal"
						/>
					</label>
				</div>
				<label class="block space-y-1 font-medium">
					Style (facultatif)
					<select
						name="genre"
						class="w-full rounded-md border bg-background p-2 text-sm font-normal"
					>
						<option value="">Tous styles</option>
						{#each data.genres as g (g.slug)}
							<option value={g.slug} selected={form?.values?.genre === g.slug}>{g.name}</option>
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
								value={1}
								class="w-20 rounded-md border bg-background p-2"
							/>
						</label>
					{/each}
					<div class="flex gap-2">
						<label for="spot-add" class="sr-only">Instrument à ajouter</label>
						<select
							id="spot-add"
							bind:value={toAdd}
							class="flex-1 rounded-md border bg-background p-2 text-sm"
						>
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
						placeholder="Tous niveaux. On travaille deux morceaux, puis on improvise."
						class="w-full rounded-md border bg-background p-2 text-sm font-normal"
						>{form?.values?.description ?? ''}</textarea
					>
				</label>
				<button
					type="submit"
					class="min-h-11 w-full rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
					>Publier l’atelier</button
				>
			</form>
		{/if}
	</div>
</div>
