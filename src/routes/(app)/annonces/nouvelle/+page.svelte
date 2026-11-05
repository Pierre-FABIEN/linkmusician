<script lang="ts">
	// LINKMUSICIAN: publier une annonce (P2-02), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import { INSTRUMENT_FAMILY_LABELS } from '#lib/skills/instruments';
	import { INSTRUMENT_LEVELS } from '#lib/skills/levels';
	import {
		DEFAULT_DURATION,
		MAX_DESCRIPTION,
		MAX_SLOTS,
		MAX_TITLE,
		OPPORTUNITY_DURATIONS,
		OPPORTUNITY_KINDS,
		OPPORTUNITY_KIND_INFO,
		OPPORTUNITY_RADII
	} from '#lib/opportunities/rules';

	let { data, form } = $props();
	const v = $derived((form?.values ?? {}) as Record<string, string>);
	let sending = $state(false);
	const field = 'w-full rounded-md border bg-background p-2';
</script>

<SEO title="Publier une annonce" noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<div class="mx-auto max-w-2xl space-y-4">
		<h1 class="text-3xl font-black tracking-tight">Publier une annonce</h1>
		{#if !data.commune}
			<p class="rounded-2xl border bg-card p-6 text-center">
				Une annonce se diffuse autour de ta ville : indique-la d'abord.
				<a href="/profil/ville" class="block pt-2 font-semibold underline">Indiquer ma ville</a>
			</p>
		{:else}
			<p class="text-sm text-muted-foreground">
				Diffusée autour de {data.commune}. Publier ne rapporte pas de points : c'est quand quelqu'un
				répond et que vous jouez ensemble que chacun gagne.
			</p>
			{#if form?.error}
				<p
					role="alert"
					class="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm"
				>
					{form.error}
				</p>
			{/if}
			<form
				method="POST"
				class="space-y-4"
				use:enhance={() => {
					sending = true;
					return async ({ update }) => {
						await update({ reset: false });
						sending = false;
					};
				}}
			>
				<fieldset class="space-y-2">
					<legend class="font-medium">Type</legend>
					<div class="grid gap-2 sm:grid-cols-3">
						{#each OPPORTUNITY_KINDS as k (k)}
							<label
								class="flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border p-3 has-[:checked]:border-primary"
							>
								<input
									type="radio"
									name="kind"
									value={k}
									checked={(v.kind ?? 'JAM') === k}
									class="mt-1 size-4"
								/>
								<span>
									<span class="block font-semibold">{OPPORTUNITY_KIND_INFO[k].label}</span>
									<span class="block text-xs text-muted-foreground"
										>{OPPORTUNITY_KIND_INFO[k].hint}</span
									>
								</span>
							</label>
						{/each}
					</div>
				</fieldset>
				<label class="block space-y-1 font-medium">
					Titre
					<input
						name="title"
						required
						maxlength={MAX_TITLE}
						value={v.title ?? ''}
						placeholder="Jam funk jeudi soir"
						class={field}
					/>
				</label>
				<label class="block space-y-1 font-medium">
					Description
					<textarea
						name="description"
						required
						rows="5"
						maxlength={MAX_DESCRIPTION}
						placeholder="Ce que vous jouez, le lieu (le quartier suffit), l'ambiance…"
						class={field}>{v.description ?? ''}</textarea
					>
				</label>
				<div class="grid gap-3 sm:grid-cols-2">
					<label class="block space-y-1 text-sm font-medium">
						Instrument recherché
						<select name="instrument" class={field}>
							<option value="">Peu importe</option>
							{#each data.instruments as family (family.family)}
								<optgroup label={INSTRUMENT_FAMILY_LABELS[family.family]}>
									{#each family.instruments as i (i.slug)}
										<option value={i.slug} selected={v.instrument === i.slug}>{i.name}</option>
									{/each}
								</optgroup>
							{/each}
						</select>
					</label>
					<label class="block space-y-1 text-sm font-medium">
						Niveau minimal
						<select name="minLevel" class={field}>
							<option value="">Tous niveaux</option>
							{#each INSTRUMENT_LEVELS as l (l.level)}
								<option value={l.level} selected={v.minLevel === String(l.level)}>{l.label}</option>
							{/each}
						</select>
					</label>
					<label class="block space-y-1 text-sm font-medium">
						Genre
						<select name="genre" class={field}>
							<option value="">Peu importe</option>
							{#each data.genres as g (g.slug)}
								<optgroup label={g.name}>
									<option value={g.slug} selected={v.genre === g.slug}>{g.name}</option>
									{#each g.children as c (c.slug)}
										<option value={c.slug} selected={v.genre === c.slug}>{c.name}</option>
									{/each}
								</optgroup>
							{/each}
						</select>
					</label>
					<label class="block space-y-1 text-sm font-medium">
						Palier minimal
						<select name="minTier" class={field}>
							<option value="">Ouvert à tous</option>
							{#each data.tiers as t (t.id)}
								<option value={t.id} selected={v.minTier === t.id}>{t.label}</option>
							{/each}
						</select>
					</label>
					<label class="block space-y-1 text-sm font-medium">
						Diffusion
						<select name="radiusKm" class={field}>
							{#each OPPORTUNITY_RADII as r (r)}
								<option value={r} selected={(v.radiusKm ?? '25') === String(r)}
									>{r} km autour de toi</option
								>
							{/each}
						</select>
					</label>
					<label class="block space-y-1 text-sm font-medium">
						Places
						<input
							name="slots"
							type="number"
							inputmode="numeric"
							min="1"
							max={MAX_SLOTS}
							value={v.slots ?? '1'}
							class={field}
						/>
					</label>
					<label class="block space-y-1 text-sm font-medium">
						Date (facultatif)
						<input name="startsAt" type="date" value={v.startsAt ?? ''} class={field} />
					</label>
					<label class="block space-y-1 text-sm font-medium">
						Visible pendant
						<select name="durationDays" class={field}>
							{#each OPPORTUNITY_DURATIONS as d (d)}
								<option
									value={d}
									selected={(v.durationDays ?? String(DEFAULT_DURATION)) === String(d)}
									>{d} jours</option
								>
							{/each}
						</select>
					</label>
				</div>
				<button
					type="submit"
					disabled={sending}
					class="min-h-11 w-full rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto"
				>
					Publier
				</button>
			</form>
		{/if}
	</div>
</div>
