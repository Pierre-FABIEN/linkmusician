<script lang="ts">
	// LINKMUSICIAN: fiche d'un lieu (P2-14a), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import { BadgeCheck, CircleCheck, Clock, MapPin, Speaker } from 'lucide-svelte';
	import { REPORT_REASONS, REPORT_REASON_LABELS, MAX_REPORT_DETAILS } from '#lib/moderation/rules';

	let { data, form } = $props();
	const labelOf = $derived(new Map(data.backlineOptions.map((o) => [o.value, o.label])));
	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Paris'
	});

	$effect(() => {
		if (data.added) {
			toast.success(
				data.venue.validated
					? 'Lieu ajouté à l’annuaire. Merci !'
					: 'Lieu proposé. Merci ! Il sera visible dès qu’un autre membre l’aura confirmé.'
			);
		}
	});
	$effect(() => {
		if (form?.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});
</script>

<SEO title={data.venue.name} noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<article class="mx-auto max-w-5xl space-y-6 lg:space-y-8">
		<div class="space-y-2">
			<a href="/lieux" class="text-sm text-muted-foreground underline">← Lieux de jam</a>
			<h1 class="text-3xl font-black tracking-tight sm:text-4xl">{data.venue.name}</h1>
			<p class="flex items-center gap-1 text-muted-foreground">
				<MapPin class="size-4" aria-hidden="true" />
				{data.venue.kindLabel} · {data.venue.communeName} ({data.venue.departmentCode})
			</p>
			{#if data.venue.verified}
				<p class="flex items-center gap-1 text-sm font-semibold text-primary">
					<BadgeCheck class="size-4" aria-hidden="true" /> Établissement vérifié (existe à l’Insee)
				</p>
			{/if}
		</div>

		{#if !data.venue.validated}
			<section
				class="space-y-3 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4"
				aria-labelledby="pending-title"
			>
				<h2 id="pending-title" class="flex items-center gap-2 font-semibold">
					<Clock class="size-4" aria-hidden="true" /> En attente de confirmation
				</h2>
				{#if data.venue.canConfirm}
					<p class="text-sm">
						Un membre vient de proposer ce lieu. Tu le connais ? Confirme qu’il existe et qu’il
						s’agit bien d’un lieu public ou professionnel : il pourra alors accueillir des jams.
					</p>
					<form method="POST" action="?/confirm" use:enhance>
						<button
							class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
						>
							<CircleCheck class="size-4" aria-hidden="true" /> Je confirme ce lieu
						</button>
					</form>
				{:else}
					<p class="text-sm">
						Pour éviter les faux lieux, ta fiche reste visible de toi seul·e jusqu’à ce qu’un autre
						membre la confirme ou que la modération la valide. Tu connais quelqu’un qui y joue ?
						Envoie-lui le lien de cette page.
					</p>
				{/if}
				{#if data.venue.canEditBackline}
					<form method="POST" action="?/siret" use:enhance class="space-y-2">
						<label class="block space-y-1 text-sm font-medium">
							Tu as son numéro SIRET ? Le lieu est validé tout de suite.
							<input
								name="siret"
								required
								inputmode="numeric"
								autocomplete="off"
								maxlength="17"
								placeholder="14 chiffres"
								class="min-h-11 w-full rounded-md border bg-background px-3 font-normal"
							/>
						</label>
						<button class="min-h-11 rounded-xl border bg-background px-4 font-semibold"
							>Vérifier le SIRET</button
						>
					</form>
				{/if}
			</section>
		{/if}

		<section class="space-y-3 rounded-2xl border bg-card p-4" aria-labelledby="backline-title">
			<h2 id="backline-title" class="flex items-center gap-2 text-lg font-semibold">
				<Speaker class="size-4" aria-hidden="true" /> Matériel sur place
			</h2>
			{#if data.venue.backline.length === 0}
				<p class="text-sm text-muted-foreground">
					Pas de matériel indiqué : chacun·e apporte le sien.
				</p>
			{:else}
				<ul class="flex flex-wrap gap-2">
					{#each data.venue.backline as item (item)}
						<li class="rounded-full border px-3 py-1 text-sm">{labelOf.get(item)}</li>
					{/each}
				</ul>
			{/if}
			{#if data.venue.canEditBackline}
				<details class="text-sm">
					<summary class="cursor-pointer font-semibold underline">Modifier le matériel</summary>
					<form method="POST" action="?/backline" use:enhance class="mt-3 space-y-3">
						<fieldset class="grid grid-cols-2 gap-2">
							<legend class="sr-only">Matériel mis à disposition</legend>
							{#each data.backlineOptions as o (o.value)}
								<label class="flex min-h-11 items-center gap-2 rounded-md border px-3">
									<input
										type="checkbox"
										name="backline"
										value={o.value}
										checked={data.venue.backline.includes(o.value)}
									/>
									{o.label}
								</label>
							{/each}
						</fieldset>
						<button class="min-h-11 rounded-xl border px-4 font-semibold">Enregistrer</button>
					</form>
				</details>
			{/if}
		</section>

		{#if data.venue.validated}
			<section class="space-y-2 rounded-2xl border bg-card p-4" aria-labelledby="jams-title">
				<h2 id="jams-title" class="text-lg font-semibold">Jams à venir</h2>
				{#if data.jams.length === 0}
					<p class="text-sm text-muted-foreground">Pas de jam prévue ici pour l’instant.</p>
				{:else}
					<ul class="grid gap-2 sm:grid-cols-2">
						{#each data.jams as j (j.id)}
							<li>
								<a href="/jams/{j.id}" class="block rounded-xl border p-3 hover:border-primary">
									<span class="block font-semibold">{j.title}</span>
									<span class="text-sm text-muted-foreground"
										>{day.format(new Date(j.startsAt))} · {j.coming} vien{j.coming > 1
											? 'nent'
											: 't'}</span
									>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
				{#if data.organizer}
					<a href="/jams/nouvelle?lieu={data.venue.id}" class="inline-block font-semibold underline"
						>Publier une jam ici</a
					>
				{/if}
			</section>
		{/if}

		{#if !data.venue.claimed}
			<p class="text-sm text-muted-foreground">
				Fiche ajoutée par un membre. Le lieu pourra la reprendre à son compte quand les comptes
				lieux arriveront.
			</p>
		{/if}

		<details class="rounded-lg border p-3 text-sm">
			<summary class="cursor-pointer text-muted-foreground">Signaler ce lieu</summary>
			<form method="POST" action="?/report" use:enhance class="mt-3 space-y-3">
				<label class="block space-y-1 font-medium">
					Motif
					<select name="reason" required class="w-full rounded-md border bg-background p-2">
						<option value="">—</option>
						{#each REPORT_REASONS as r (r)}<option value={r}>{REPORT_REASON_LABELS[r]}</option
							>{/each}
					</select>
				</label>
				<label class="block space-y-1 font-medium">
					Précisions (facultatif)
					<textarea
						name="details"
						rows="3"
						maxlength={MAX_REPORT_DETAILS}
						placeholder="Par exemple : c'est un domicile, ce lieu n'existe pas"
						class="w-full rounded-md border bg-background p-2"
					></textarea>
				</label>
				<button type="submit" class="rounded-md border px-3 py-1.5">Envoyer le signalement</button>
			</form>
		</details>
	</article>
</div>
