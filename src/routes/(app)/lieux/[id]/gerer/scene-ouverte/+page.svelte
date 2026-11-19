<script lang="ts">
	// LINKMUSICIAN: publier une scène ouverte récurrente (P5-04a), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import { MAX_SPOTS_PER_INSTRUMENT } from '#lib/jam/publicJam';
	import { defaultSeriesTitle, SERIES_WEEKDAYS, SERIES_WEEKS_AHEAD } from '#lib/jam/series';
	import { VENUE_WEEKDAY_LABELS } from '#lib/venues/profile';

	let { data, form } = $props();
	const input = 'w-full rounded-md border bg-background p-2 text-sm font-normal';

	// Valeurs initiales seulement : la personne modifie ensuite librement.
	// svelte-ignore state_referenced_locally
	let weekday = $state(Number(form?.values?.weekday ?? data.venue.firstDay));
	// svelte-ignore state_referenced_locally
	let title = $state(form?.values?.title ?? defaultSeriesTitle(weekday));
	// Le titre suit le jour tant que la personne ne l'a pas changé.
	let titleEdited = $state(false);
	function pickDay(event: Event) {
		weekday = Number((event.currentTarget as HTMLSelectElement).value);
		if (!titleEdited) title = defaultSeriesTitle(weekday);
	}

	let picked = $state<string[]>([]);
	let toAdd = $state('');
	const nameOf = (slug: string) => data.instruments.find((i) => i.slug === slug)?.name ?? slug;
	function addSpot() {
		if (toAdd && !picked.includes(toAdd)) picked = [...picked, toAdd];
		toAdd = '';
	}
</script>

<SEO title="Scène ouverte · {data.venue.name}" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6 rounded-3xl border bg-card p-5 shadow-sm sm:p-8 lg:p-10">
		<div class="space-y-2">
			<a href="/lieux/{data.venue.id}/gerer" class="text-sm text-muted-foreground underline"
				>← Gérer {data.venue.name}</a
			>
			<h1 class="text-3xl font-black tracking-tight sm:text-4xl">
				Une scène ouverte chaque semaine
			</h1>
			<p class="text-sm text-muted-foreground">
				Le même jour, aux mêmes heures. Les jams des {SERIES_WEEKS_AHEAD} semaines à venir apparaissent
				tout de suite dans Rencontre des musicien·nes autour ; les suivantes arrivent d’elles-mêmes. Personne
				ne reçoit de notification : on la découvre dans le calendrier.
			</p>
		</div>

		{#if form?.error}
			<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
				{form.error}
			</p>
		{/if}

		{#if !data.venue.published}
			<p role="status" class="rounded-xl border bg-muted/40 p-3 text-sm">
				Publie d’abord la fiche du lieu : <a
					href="/lieux/{data.venue.id}/gerer#fiche"
					class="font-semibold underline">compléter la fiche</a
				>.
			</p>
		{:else}
			<form method="POST" use:enhance class="space-y-4">
				<div class="grid gap-3 sm:grid-cols-3">
					<label class="col-span-full block space-y-1 font-medium sm:col-span-1">
						Chaque
						<select
							name="weekday"
							required
							value={String(weekday)}
							onchange={pickDay}
							class={input}
						>
							{#each SERIES_WEEKDAYS as d (d)}
								<option value={String(d)}>{VENUE_WEEKDAY_LABELS[d]}</option>
							{/each}
						</select>
					</label>
					<label class="block space-y-1 font-medium">
						Début
						<input
							type="time"
							name="start"
							required
							value={form?.values?.start ?? '20:00'}
							class={input}
						/>
					</label>
					<label class="block space-y-1 font-medium">
						Fin
						<input
							type="time"
							name="end"
							required
							value={form?.values?.end ?? '23:00'}
							class={input}
						/>
					</label>
				</div>
				<label class="block space-y-1 font-medium">
					Titre
					<input
						name="title"
						required
						maxlength="80"
						bind:value={title}
						oninput={() => (titleEdited = true)}
						class={input}
					/>
				</label>
				<label class="block space-y-1 font-medium">
					Style (facultatif)
					<select name="genre" class={input}>
						<option value="">Tous styles</option>
						{#each data.genres as g (g.slug)}
							<option value={g.slug} selected={form?.values?.genre === g.slug}>{g.name}</option>
						{/each}
					</select>
				</label>

				<fieldset class="space-y-2">
					<legend class="font-medium">Places souhaitées chaque semaine (facultatif)</legend>
					{#each picked as slug (slug)}
						<label class="flex items-center justify-between gap-2 text-sm">
							{nameOf(slug)}
							<input
								type="number"
								name="spot-{slug}"
								min="0"
								max={MAX_SPOTS_PER_INSTRUMENT}
								value="1"
								class="w-20 rounded-md border bg-background p-2"
							/>
						</label>
					{/each}
					<div class="flex gap-2">
						<label for="spot-add" class="sr-only">Instrument à ajouter</label>
						<select
							id="spot-add"
							bind:value={toAdd}
							class="min-h-11 flex-1 rounded-md border bg-background p-2 text-sm"
						>
							<option value="">Choisir un instrument</option>
							{#each data.instruments.filter((i) => !picked.includes(i.slug)) as i (i.slug)}
								<option value={i.slug}>{i.name}</option>
							{/each}
						</select>
						<button type="button" onclick={addSpot} class="min-h-11 rounded-md border px-3 text-sm"
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
						placeholder="Batterie et ampli basse sur place. Inscription au bar dès 19 h 30."
						class={input}>{form?.values?.description ?? ''}</textarea
					>
				</label>
				<button
					type="submit"
					class="min-h-11 w-full rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
					>Publier la scène ouverte</button
				>
			</form>
		{/if}
	</div>
</div>
