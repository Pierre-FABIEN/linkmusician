<script lang="ts">
	// LINKMUSICIAN: publier un plateau (P5-05a), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import { MAX_DESCRIPTION, MAX_TITLE, OPPORTUNITY_RADII } from '#lib/opportunities/rules';
	import { MAX_GIG_BANDS } from '#lib/opportunities/gigSlot';
	import {
		BAND_FORMATIONS,
		BAND_FORMATION_INFO,
		BAND_REPERTOIRES,
		BAND_REPERTOIRE_INFO,
		OPPORTUNITY_PAYS,
		OPPORTUNITY_PAY_LABELS,
		PAY_WITH_RANGE,
		type OpportunityPayValue
	} from '#lib/opportunities/qualification';

	let { data, form } = $props();
	const v = $derived((form?.values ?? {}) as Record<string, string>);
	let sending = $state(false);
	// Au nom de (P5-05b) : moi, ou une organisation que je gère.
	// svelte-ignore state_referenced_locally
	let asOrg = $state<string>(v.asOrg ?? (data.promoter ? data.defaultOrg : ''));
	const issuer = $derived(
		data.promoter ? (data.orgs.find((o) => o.handle === asOrg) ?? null) : null
	);
	const zoneCommune = $derived(issuer ? issuer.commune : data.promoter ? data.commune : null);
	const field = 'w-full rounded-md border bg-background p-2 text-sm font-normal';
	// Conditions (ONB-13b) : un cachet peut avoir une fourchette.
	// svelte-ignore state_referenced_locally
	let pay = $state<string>(v.pay ?? '');
	const ranged = $derived(PAY_WITH_RANGE.includes(pay as OpportunityPayValue));
</script>

<SEO title="Publier un plateau" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-5xl space-y-6">
		<div class="space-y-2">
			<a href="/annonces" class="text-sm text-muted-foreground underline">← Annonces</a>
			<h1 class="lm-title">Publier un plateau</h1>
			<p class="text-sm text-muted-foreground">
				Une date dans un lieu de l’annuaire : les groupes autour de toi candidatent, tu choisis ton
				affiche. Publier ne rapporte pas de points ; c’est la date tenue, confirmée par les groupes,
				qui comptera.
			</p>
		</div>

		{#if !data.promoter}
			<div class="lm-tile lm-tile--flow space-y-3 p-5">
				<p class="font-semibold">Ajoute d’abord le métier « Organisateur·rice ».</p>
				<p class="text-sm text-muted-foreground">
					Il est réservé aux personnes majeures. Tu peux le cumuler avec tes autres métiers.
				</p>
				<a href="/reglages/metiers" class="lm-btn">Choisir mes métiers</a>
			</div>
		{:else if !data.canPublishAsMe && data.orgs.length === 0}
			<p class="lm-tile lm-tile--flow p-6 text-center">
				Un plateau se diffuse autour de ta ville : indique-la d’abord.
				<a href="/profil/ville" class="block pt-2 font-semibold underline">Indiquer ma ville</a>
			</p>
		{:else if data.venues.length === 0 && !data.orgs.some((o) => o.venueId)}
			<p class="rounded-md border p-3 text-sm">
				Aucun lieu de l’annuaire autour de toi.
				<a href="/lieux/nouveau" class="font-semibold underline">Ajoute d’abord le lieu</a>.
			</p>
		{:else}
			{#if form?.error}
				<p role="alert" class="lm-alert p-3 text-sm">
					{form.error}
				</p>
			{/if}
			<form
				method="POST"
				class="space-y-5"
				use:enhance={() => {
					sending = true;
					return async ({ update }) => {
						await update({ reset: false });
						sending = false;
					};
				}}
			>
				{#if data.orgs.length > 0}
					<label class="block space-y-1 font-medium">
						Publier au nom de
						<select name="asOrg" bind:value={asOrg} class={field}>
							{#if data.canPublishAsMe}<option value="">Moi</option>{/if}
							{#each data.orgs as o (o.handle)}
								<option value={o.handle}>{o.name}</option>
							{/each}
						</select>
						{#if issuer}
							<span class="block text-sm font-normal text-muted-foreground"
								>Toute la gestion de {issuer.name} verra les candidatures et pourra les trancher.</span
							>
						{/if}
					</label>
				{/if}
				{#if issuer?.venueId}
					<!-- Un lieu publie ses dates chez lui (P5-03b). -->
					<input type="hidden" name="venueId" value={issuer.venueId} />
					<p class="font-medium">Lieu : <span class="font-normal">{issuer.name}</span></p>
				{:else}
					<label class="block space-y-1 font-medium">
						Lieu
						<select name="venueId" required class={field}>
							<option value="">—</option>
							{#each data.venues as venue (venue.id)}
								<option value={venue.id} selected={(v.venueId ?? data.venueId) === venue.id}
									>{venue.label}</option
								>
							{/each}
						</select>
						<a href="/lieux/nouveau" class="text-sm font-normal underline">Le lieu n’y est pas ?</a>
					</label>
				{/if}
				<div class="grid gap-3 sm:grid-cols-2">
					<label class="block space-y-1 font-medium">
						Date
						<input
							name="day"
							type="date"
							required
							min={data.today}
							value={v.day ?? ''}
							class={field}
						/>
					</label>
					<label class="block space-y-1 font-medium">
						Heure de début
						<input name="start" type="time" required value={v.start ?? '20:30'} class={field} />
					</label>
				</div>
				<label class="block space-y-1 font-medium">
					Titre
					<input
						name="title"
						required
						maxlength={MAX_TITLE}
						value={v.title ?? ''}
						placeholder="Plateau rock du vendredi"
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
						placeholder="Durée des sets, cachet ou chapeau, matériel sur place, ce que tu attends des groupes…"
						class={field}>{v.description ?? ''}</textarea
					>
				</label>

				<fieldset class="lm-tile lm-tile--flow space-y-3 p-4">
					<legend class="px-1 font-semibold">Qui peut candidater</legend>
					<p class="text-sm text-muted-foreground">
						Des conditions sur ce que les groupes ont prouvé, jamais sur leurs points. Un groupe
						hors conditions ne peut pas candidater.
					</p>
					<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<label class="block space-y-1 text-sm font-medium">
							Groupes à l’affiche
							<input
								name="slots"
								type="number"
								inputmode="numeric"
								min="1"
								max={MAX_GIG_BANDS}
								value={v.slots ?? '2'}
								class={field}
							/>
						</label>
						<label class="block space-y-1 text-sm font-medium">
							Rang minimal du groupe
							<select name="minBandTier" class={field}>
								<option value="">Ouvert à tous</option>
								{#each data.tiers as t (t.id)}
									<option value={t.id} selected={v.minBandTier === t.id}>{t.label} ou plus</option>
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
							Zone
							<select name="radiusKm" class={field}>
								{#each OPPORTUNITY_RADII as r (r)}
									<option value={r} selected={(v.radiusKm ?? '50') === String(r)}
										>Groupes à {r} km de {zoneCommune}</option
									>
								{/each}
							</select>
						</label>
					</div>
				</fieldset>

				<!-- LINKMUSICIAN: conditions du plateau (ONB-13b, D63), toutes facultatives. -->
				<fieldset class="space-y-3">
					<legend class="font-medium">Conditions (facultatif)</legend>
					<p class="text-sm text-muted-foreground">
						Un groupe n’est écarté que si sa fiche dit clairement le contraire ; une fiche qui ne
						précise rien reste « non précisé ».
					</p>
					<div class="grid gap-4 md:grid-cols-3">
						<label class="block space-y-1 text-sm font-medium">
							Cachet
							<select name="pay" bind:value={pay} class={field}>
								<option value="">Non précisé</option>
								{#each OPPORTUNITY_PAYS as p (p)}
									<option value={p}>{OPPORTUNITY_PAY_LABELS[p]}</option>
								{/each}
							</select>
						</label>
						{#if ranged}
							<label class="block space-y-1 text-sm font-medium">
								De (€, facultatif)
								<input
									name="payMin"
									type="number"
									inputmode="numeric"
									min="0"
									value={v.payMin ?? ''}
									class={field}
								/>
							</label>
							<label class="block space-y-1 text-sm font-medium">
								À (€, facultatif)
								<input
									name="payMax"
									type="number"
									inputmode="numeric"
									min="0"
									value={v.payMax ?? ''}
									class={field}
								/>
							</label>
						{/if}
						<label class="block space-y-1 text-sm font-medium">
							Formation recherchée
							<select name="formation" class={field}>
								<option value="">Peu importe</option>
								{#each BAND_FORMATIONS as f (f)}
									<option value={f} selected={v.formation === f}
										>{BAND_FORMATION_INFO[f].label}</option
									>
								{/each}
							</select>
						</label>
						<label class="block space-y-1 text-sm font-medium">
							Répertoire recherché
							<select name="repertoire" class={field}>
								<option value="">Peu importe</option>
								{#each BAND_REPERTOIRES as r (r)}
									<option value={r} selected={v.repertoire === r}
										>{BAND_REPERTOIRE_INFO[r].label}</option
									>
								{/each}
							</select>
						</label>
					</div>
				</fieldset>

				<button
					type="submit"
					disabled={sending}
					class="lm-btn w-full disabled:opacity-50 sm:w-auto"
				>
					Publier le plateau
				</button>
			</form>
		{/if}
	</div>
</div>
