<script lang="ts">
	// LINKMUSICIAN: recherche de musicien·nes (P2-01), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import * as Avatar from '#shadcn/avatar';
	import { Badge } from '#shadcn/badge';
	import { MapPin, Search, Sparkles } from 'lucide-svelte';
	import { initialsOf } from '#lib/actors/display';
	import { INSTRUMENT_FAMILY_LABELS } from '#lib/skills/instruments';
	import { INSTRUMENT_LEVELS, levelLabel, type InstrumentLevel } from '#lib/skills/levels';
	import {
		LOOKING_FOR,
		LOOKING_FOR_LABELS,
		PRO_STATUSES,
		PRO_STATUS_INFO,
		proStatusLabel
	} from '#lib/actors/profile';
	import { SEARCH_RADII, filtersToParams } from '#lib/search/filters';

	let { data } = $props();
	const f = $derived(data.filters);
	const nextPage = $derived(`?${filtersToParams({ ...f, page: f.page + 1 })}`);
	const select = 'w-full rounded-md border bg-background p-2 text-sm';
	/** Volet « Plus de filtres » ouvert d'office si l'un d'eux est actif. */
	const secondaryActive = $derived(
		Boolean(f.minLevel || f.genre || f.lookingFor || f.proStatus || f.reciprocal)
	);
</script>

<SEO title="Découvrir" noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<div class="mx-auto max-w-5xl space-y-6">
		<header class="space-y-1">
			<h1 class="text-3xl font-black tracking-tight">Découvrir</h1>
			<p class="text-muted-foreground">
				Trouve avec qui jouer{data.commune ? ` autour de ${data.commune}` : ''}.
			</p>
		</header>

		<form method="GET" class="space-y-3 rounded-2xl border bg-card p-4">
			<div class="grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
				<label class="space-y-1 text-sm font-medium">
					Instrument
					<select name="instrument" class={select}>
						<option value="">Tous</option>
						{#each data.instruments as family (family.family)}
							<optgroup label={INSTRUMENT_FAMILY_LABELS[family.family]}>
								{#each family.instruments as i (i.slug)}
									<option value={i.slug} selected={f.instrument === i.slug}>{i.name}</option>
								{/each}
							</optgroup>
						{/each}
					</select>
				</label>
				<label class="space-y-1 text-sm font-medium">
					Distance
					<select name="rayon" class={select}>
						{#each SEARCH_RADII as r (r)}
							<option value={r} selected={f.radius === r}>{r} km</option>
						{/each}
					</select>
				</label>
				<button
					type="submit"
					class="flex min-h-11 w-full items-center justify-center gap-2 self-end rounded-xl bg-primary px-4 font-semibold text-primary-foreground sm:w-auto"
				>
					<Search class="size-4" aria-hidden="true" /> Chercher
				</button>
			</div>
			<!-- Mobile d'abord : l'essentiel visible, le reste replié (ouvert si actif). -->
			<details open={secondaryActive}>
				<summary class="min-h-11 cursor-pointer content-center text-sm font-medium text-primary">
					Plus de filtres{secondaryActive ? ' (actifs)' : ''}
				</summary>
				<div class="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<label class="space-y-1 text-sm font-medium">
						Niveau minimal
						<select name="niveau" class={select}>
							<option value="">Tous</option>
							{#each INSTRUMENT_LEVELS as l (l.level)}
								<option value={l.level} selected={f.minLevel === l.level}>{l.label}</option>
							{/each}
						</select>
					</label>
					<label class="space-y-1 text-sm font-medium">
						Genre
						<select name="genre" class={select}>
							<option value="">Tous</option>
							{#each data.genres as g (g.slug)}
								<optgroup label={g.name}>
									<option value={g.slug} selected={f.genre === g.slug}>{g.name} (tout)</option>
									{#each g.children as c (c.slug)}
										<option value={c.slug} selected={f.genre === c.slug}>{c.name}</option>
									{/each}
								</optgroup>
							{/each}
						</select>
					</label>
					<label class="space-y-1 text-sm font-medium">
						Envie de
						<select name="recherche" class={select}>
							<option value="">Peu importe</option>
							{#each LOOKING_FOR as l (l)}
								<option value={l} selected={f.lookingFor === l}>{LOOKING_FOR_LABELS[l]}</option>
							{/each}
						</select>
					</label>
					<label class="space-y-1 text-sm font-medium">
						Statut
						<select name="statut" class={select}>
							<option value="">Tous</option>
							{#each PRO_STATUSES as s (s)}
								<option value={s} selected={f.proStatus === s}>{PRO_STATUS_INFO[s].label}</option>
							{/each}
						</select>
					</label>
					<label class="flex items-center gap-2 self-end pb-2 text-sm">
						<input
							type="checkbox"
							name="reciproque"
							value="1"
							checked={f.reciprocal}
							class="size-5"
						/>
						Qui peut venir jusqu'à moi
					</label>
				</div>
			</details>
		</form>

		{#if data.state === 'no-location'}
			<p class="rounded-2xl border bg-card p-6 text-center">
				Indique d'abord ta ville pour trouver des musicien·nes près de chez toi.
				<a href="/profil/ville" class="block pt-2 font-semibold underline">Indiquer ma ville</a>
			</p>
		{:else if data.state === 'limited'}
			<p class="rounded-2xl border bg-card p-6 text-center">
				Beaucoup de recherches d'un coup ! Patiente quelques secondes et réessaie.
			</p>
		{:else if data.results.length === 0}
			<div class="space-y-2 rounded-2xl border bg-card p-6 text-center">
				<Sparkles class="mx-auto size-6 text-primary" aria-hidden="true" />
				<p class="font-semibold">Personne ne correspond pour l'instant.</p>
				<p class="text-sm text-muted-foreground">
					Élargis la distance ou retire un filtre. La communauté grandit : reviens bientôt !
				</p>
			</div>
		{:else}
			<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Résultats">
				{#each data.results as r (r.handle)}
					<li>
						<a
							href="/@{r.handle}"
							class="flex h-full flex-col gap-3 rounded-2xl border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
						>
							<span class="flex items-center gap-3">
								<Avatar.Root class="size-12">
									<Avatar.Fallback class="bg-violet-100 font-bold text-violet-800"
										>{initialsOf(r.displayName)}</Avatar.Fallback
									>
								</Avatar.Root>
								<span class="min-w-0">
									<span class="block truncate font-bold">{r.displayName}</span>
									<span class="flex items-center gap-1 text-xs text-muted-foreground">
										<MapPin class="size-3" aria-hidden="true" />
										{r.distance}{r.commune ? ` · ${r.commune}` : ''}
									</span>
								</span>
							</span>
							{#if r.instruments.length > 0}
								<span class="text-sm">
									{#each r.instruments as i, k (i.name)}{k > 0 ? ' · ' : ''}{i.name}
										<span class="text-muted-foreground"
											>· {levelLabel(i.level as InstrumentLevel)}</span
										>{/each}
								</span>
							{/if}
							<span class="flex flex-wrap gap-1">
								{#if r.proStatus}<Badge variant="secondary">{proStatusLabel(r.proStatus)}</Badge
									>{/if}
								{#each r.genres as g (g)}<Badge variant="outline">{g}</Badge>{/each}
							</span>
							{#if r.lookingFor.length > 0}
								<span class="text-xs text-muted-foreground">
									Envie de : {r.lookingFor.map((l) => LOOKING_FOR_LABELS[l]).join(', ')}
								</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
			{#if data.hasMore}
				<a
					href={nextPage}
					class="mx-auto flex min-h-11 w-fit items-center rounded-xl border px-5 font-semibold hover:bg-muted"
					>Voir plus</a
				>
			{/if}
		{/if}

		<p class="flex items-center gap-2 text-sm text-muted-foreground">
			<Sparkles class="size-4" aria-hidden="true" /> Bientôt ici : « Je suis dispo » et les jams ouvertes
			autour de toi.
		</p>
	</div>
</div>
