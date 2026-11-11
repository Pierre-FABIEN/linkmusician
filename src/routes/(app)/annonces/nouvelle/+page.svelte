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
		GENERAL_KINDS,
		OPPORTUNITY_KIND_INFO,
		OPPORTUNITY_RADII,
		OPPORTUNITY_TARGETS,
		OPPORTUNITY_TARGET_LABELS,
		TARGET_SPECIALTIES,
		type OpportunityTarget
	} from '#lib/opportunities/rules';

	let { data, form } = $props();
	const v = $derived((form?.values ?? {}) as Record<string, string>);
	let sending = $state(false);
	// Au nom de (P3-03) : moi, ou un groupe que je gère (recrutement seulement).
	// svelte-ignore state_referenced_locally
	let asBand = $state<string>(v.asBand ?? data.defaultBand);
	// svelte-ignore state_referenced_locally
	let kind = $state<string>(v.kind ?? (data.defaultBand ? 'RECRUIT_MEMBER' : data.defaultKind));
	// Qui l'annonce cherche (P4-05) : un métier du son passe par une session.
	// svelte-ignore state_referenced_locally
	let target = $state<OpportunityTarget>(
		(v.target as OpportunityTarget | undefined) ?? data.prefill.target
	);
	const pro = $derived(target !== 'MUSICIAN');
	$effect(() => {
		if (pro) {
			kind = 'SESSION_WORK';
			asBand = '';
		}
	});
	const band = $derived(data.bands.find((b) => b.handle === asBand) ?? null);
	const commune = $derived(band ? band.commune : data.commune);
	$effect(() => {
		if (band) kind = 'RECRUIT_MEMBER';
	});
	const field = 'w-full rounded-md border bg-background p-2';
</script>

<SEO title="Publier une annonce" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-6xl space-y-5">
		<h1 class="text-3xl font-black tracking-tight sm:text-4xl">Publier une annonce</h1>
		{#if !data.commune && data.bands.length === 0}
			<p class="rounded-2xl border bg-card p-6 text-center">
				Une annonce se diffuse autour de ta ville : indique-la d'abord.
				<a href="/profil/ville" class="block pt-2 font-semibold underline">Indiquer ma ville</a>
			</p>
		{:else}
			{#if commune}
				<p class="text-sm text-muted-foreground">
					Diffusée autour de {commune}. Publier ne rapporte pas de points : c'est quand quelqu'un
					répond et que vous jouez ensemble que chacun gagne.
				</p>
			{:else if band}
				<p role="status" class="rounded-2xl border bg-card p-4 text-sm">
					L’annonce se diffuse autour de la ville du groupe : indique-la d’abord.
					<a href="/groupes/{band.handle}/modifier" class="font-semibold underline"
						>Fiche de {band.name}</a
					>
				</p>
			{:else}
				<p role="status" class="rounded-2xl border bg-card p-4 text-sm">
					L’annonce se diffuse autour de ta ville : indique-la d’abord.
					<a href="/profil/ville" class="font-semibold underline">Indiquer ma ville</a>
				</p>
			{/if}
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
				class="space-y-5 rounded-3xl border bg-card p-4 sm:p-6 lg:p-8"
				use:enhance={() => {
					sending = true;
					return async ({ update }) => {
						await update({ reset: false });
						sending = false;
					};
				}}
			>
				{#if data.bands.length > 0}
					<label class="block space-y-1 font-medium">
						Publier au nom de
						<select name="asBand" bind:value={asBand} class={field} disabled={pro}>
							<option value="">Moi</option>
							{#each data.bands as b (b.handle)}
								<option value={b.handle}>{b.name} (groupe)</option>
							{/each}
						</select>
						{#if band}
							<span class="block text-sm font-normal text-muted-foreground"
								>Un groupe publie un recrutement : la personne retenue entre dans le groupe.</span
							>
						{/if}
					</label>
				{/if}
				<fieldset class="space-y-2">
					<legend class="font-medium">Qui cherches-tu ?</legend>
					<div class="grid gap-2 sm:grid-cols-3">
						{#each OPPORTUNITY_TARGETS as t (t)}
							<label
								class="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border p-3 has-[:checked]:border-primary"
							>
								<input type="radio" name="target" value={t} bind:group={target} class="size-4" />
								<span class="font-semibold">{OPPORTUNITY_TARGET_LABELS[t]}</span>
							</label>
						{/each}
					</div>
					{#if pro}
						<p class="text-sm text-muted-foreground">
							Seules les personnes de ce métier verront ton annonce autour d'elles.
						</p>
					{/if}
				</fieldset>
				<fieldset class="space-y-2">
					<legend class="font-medium">Type</legend>
					<div class="grid gap-2 sm:grid-cols-3">
						{#each GENERAL_KINDS as k (k)}
							<label
								class="flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border p-3 has-[:checked]:border-primary"
							>
								<input
									type="radio"
									name="kind"
									value={k}
									bind:group={kind}
									disabled={(band !== null && k !== 'RECRUIT_MEMBER') ||
										(pro && k !== 'SESSION_WORK')}
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
						value={v.title ?? data.prefill.title}
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
				<div class="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
					{#if pro}
						<label class="block space-y-1 text-sm font-medium">
							Spécialité
							<select name="specialty" class={field}>
								<option value="">Peu importe</option>
								{#each TARGET_SPECIALTIES[target] as sp (sp.id)}
									<option value={sp.id} selected={(v.specialty ?? data.prefill.specialty) === sp.id}
										>{sp.label}</option
									>
								{/each}
							</select>
						</label>
					{:else}
						<label class="block space-y-1 text-sm font-medium">
							Instrument recherché
							<select name="instrument" class={field}>
								<option value="">Peu importe</option>
								{#each data.instruments as family (family.family)}
									<optgroup label={INSTRUMENT_FAMILY_LABELS[family.family]}>
										{#each family.instruments as i (i.slug)}
											<option
												value={i.slug}
												selected={(v.instrument ?? data.prefill.instrument) === i.slug}
												>{i.name}</option
											>
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
									<option value={l.level} selected={v.minLevel === String(l.level)}
										>{l.label}</option
									>
								{/each}
							</select>
						</label>
					{/if}
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
					{#if !pro}
						<label class="block space-y-1 text-sm font-medium">
							Palier minimal
							<select name="minTier" class={field}>
								<option value="">Ouvert à tous</option>
								{#each data.tiers as t (t.id)}
									<option value={t.id} selected={v.minTier === t.id}>{t.label}</option>
								{/each}
							</select>
						</label>
					{/if}
					<label class="block space-y-1 text-sm font-medium">
						Diffusion
						<select name="radiusKm" class={field}>
							{#each OPPORTUNITY_RADII as r (r)}
								<option value={r} selected={(v.radiusKm ?? '25') === String(r)}
									>{r} km autour {band ? 'du groupe' : 'de toi'}</option
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
					{#if data.works.length > 0}
						<label class="block space-y-1 text-sm font-medium">
							Morceau concerné (facultatif)
							<select name="work" class={field}>
								<option value="">Aucun</option>
								{#each data.works as w (w.id)}
									<option value={w.id} selected={(v.work ?? data.prefill.work) === w.id}
										>{w.title}{w.band ? ` (${w.band})` : ''}</option
									>
								{/each}
							</select>
						</label>
					{/if}
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
					disabled={sending || !commune}
					class="min-h-11 w-full rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto"
				>
					Publier
				</button>
			</form>
		{/if}
	</div>
</div>
