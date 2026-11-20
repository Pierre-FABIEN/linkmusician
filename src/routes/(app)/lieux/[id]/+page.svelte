<script lang="ts">
	// LINKMUSICIAN: fiche d'un lieu (P2-14a), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import {
		BadgeCheck,
		CalendarDays,
		CircleCheck,
		Clock,
		MapPin,
		Speaker,
		Store,
		Users
	} from 'lucide-svelte';
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
	import { capacityLabel } from '#lib/crafts/promoter';
	import { VENUE_AGE_RULE_INFO, VENUE_CONDITION_LABELS, daysLabel } from '#lib/venues/profile';
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
			<h1 class="lm-title">{data.venue.name}</h1>
			<p class="flex items-center gap-1 text-muted-foreground">
				<MapPin class="size-4" aria-hidden="true" />
				{data.venue.kindLabel} · {data.venue.communeName} ({data.venue.departmentCode})
			</p>
			{#if data.venue.verified}
				<p class="flex items-center gap-1 text-sm font-semibold text-primary">
					<BadgeCheck class="size-4" aria-hidden="true" /> Établissement vérifié (existe à l’Insee)
				</p>
			{/if}
			{#if data.venue.claimed}
				<p class="flex items-center gap-1 text-sm font-semibold text-primary">
					<Store class="size-4" aria-hidden="true" /> Géré par le lieu
				</p>
			{/if}
			{#if data.profile?.tier}
				<TierBadge
					id={data.profile.tier.id}
					label={data.profile.tier.label}
					prefix="Rang du lieu :"
				/>
			{/if}
			{#if data.manages}
				<a href="/lieux/{data.venue.id}/gerer" class="lm-btn">Gérer la fiche du lieu</a>
			{/if}
		</div>

		{#if data.profile && data.profile.photos.length > 0}
			<!-- Photos du lieu (P5-03d) : la première en grand. -->
			<ul class="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Photos du lieu">
				{#each data.profile.photos as photo, i (photo.id)}
					<li class={i === 0 ? 'col-span-2 row-span-2' : ''}>
						<img
							src={photo.url}
							alt={photo.title}
							loading={i === 0 ? 'eager' : 'lazy'}
							class="h-full w-full rounded-xl border object-cover {i === 0
								? 'aspect-[4/3]'
								: 'aspect-square'}"
						/>
					</li>
				{/each}
			</ul>
		{/if}
		{#if data.profile}
			<!-- Fiche publiée par le lieu (P5-03b). -->
			<section class="lm-tile lm-tile--flow space-y-3 p-4" aria-labelledby="fiche-title">
				<h2 id="fiche-title" class="flex items-center gap-2 text-lg font-semibold">
					<Users class="size-4" aria-hidden="true" /> Jouer ici
				</h2>
				<dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
					{#if data.profile.capacity}
						<div>
							<dt class="font-semibold">Jauge</dt>
							<dd>{capacityLabel(data.profile.capacity)}</dd>
						</div>
					{/if}
					<div>
						<dt class="font-semibold">Pour les artistes</dt>
						<dd>
							{data.profile.conditions.map((c) => VENUE_CONDITION_LABELS[c]).join(', ')}
						</dd>
					</div>
					{#if data.profile.days.length > 0}
						<div>
							<dt class="font-semibold">Jours</dt>
							<dd>{daysLabel(data.profile.days)}</dd>
						</div>
					{/if}
					<div>
						<dt class="font-semibold">Public</dt>
						<dd>{VENUE_AGE_RULE_INFO[data.profile.ageRule].label}</dd>
					</div>
					{#if data.profile.genres.length > 0}
						<div class="sm:col-span-2">
							<dt class="font-semibold">Programme</dt>
							<dd>{data.profile.genres.join(', ')}</dd>
						</div>
					{/if}
					<div class="sm:col-span-2">
						<dt class="font-semibold">Scène et son</dt>
						<dd class="whitespace-pre-line">{data.profile.stage}</dd>
					</div>
				</dl>
				{#if data.profile.managers.length > 0}
					<p class="text-sm">
						Contact :
						{#each data.profile.managers as m, i (m.handle)}{i > 0 ? ', ' : ''}<a
								href="/@{m.handle}"
								class="font-medium underline">{m.displayName}</a
							>{/each}
					</p>
				{/if}
			</section>

			<section class="lm-tile lm-tile--flow space-y-2 p-4" aria-labelledby="dates-title">
				<h2 id="dates-title" class="flex items-center gap-2 text-lg font-semibold">
					<CalendarDays class="size-4" aria-hidden="true" /> Dates à venir
				</h2>
				{#if data.profile.gigSlots.length === 0}
					<p class="text-sm text-muted-foreground">
						Pas de date ouverte aux groupes pour l’instant.
					</p>
				{:else}
					<ul class="grid gap-2 sm:grid-cols-2">
						{#each data.profile.gigSlots as g (g.id)}
							<li>
								<a href="/annonces/{g.id}" class="lm-tile lm-tile--flow block p-3">
									<span class="block font-semibold">{g.title}</span>
									<span class="text-sm text-muted-foreground"
										>{g.startsAt ? day.format(new Date(g.startsAt)) : ''} · {g.slots} groupe{g.slots >
										1
											? 's'
											: ''} cherché{g.slots > 1 ? 's' : ''}</span
									>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		{#if !data.venue.validated}
			<section class="lm-note space-y-3 p-4" data-tone="amber" aria-labelledby="pending-title">
				<h2 id="pending-title" class="flex items-center gap-2 font-semibold">
					<Clock class="size-4" aria-hidden="true" /> En attente de confirmation
				</h2>
				{#if data.venue.canConfirm}
					<p class="text-sm">
						Un membre vient de proposer ce lieu. Tu le connais ? Confirme qu’il existe et qu’il
						s’agit bien d’un lieu public ou professionnel : il pourra alors accueillir des jams.
					</p>
					<form method="POST" action="?/confirm" use:enhance>
						<button class="lm-btn gap-2">
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
								class="lm-field min-h-11 w-full"
							/>
						</label>
						<button class="lm-btn bg-background" data-variant="ghost">Vérifier le SIRET</button>
					</form>
				{/if}
			</section>
		{/if}

		<section class="lm-tile lm-tile--flow space-y-3 p-4" aria-labelledby="backline-title">
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
								<label class="lm-tile lm-tile--flow flex min-h-11 items-center gap-2 px-3">
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
						<button class="lm-btn" data-variant="ghost">Enregistrer</button>
					</form>
				</details>
			{/if}
		</section>

		{#if data.venue.validated}
			<section class="lm-tile lm-tile--flow space-y-2 p-4" aria-labelledby="jams-title">
				<h2 id="jams-title" class="text-lg font-semibold">Jams à venir</h2>
				{#if data.jams.length === 0}
					<p class="text-sm text-muted-foreground">Pas de jam prévue ici pour l’instant.</p>
				{:else}
					<ul class="grid gap-2 sm:grid-cols-2">
						{#each data.jams as j (j.id)}
							<li>
								<a href="/jams/{j.id}" class="lm-tile lm-tile--flow block p-3">
									<span class="block font-semibold">{j.title}</span>
									{#if j.recurring}<span class="block text-sm text-primary">{j.recurring}</span
										>{/if}
									<span class="text-sm text-muted-foreground"
										>{day.format(new Date(j.startsAt))} · {j.coming}</span
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
				{#if data.promoter}
					<!-- LINKMUSICIAN: plateau (P5-05a). -->
					<a
						href="/plateaux/nouveau?lieu={data.venue.id}"
						class="inline-block font-semibold underline sm:ml-4">Publier un plateau ici</a
					>
				{/if}
			</section>
		{/if}

		{#if data.claim && !data.claim.claimed}
			<!-- Revendication niveau 1 (P5-03a, D31) : code publié, contrôlé à la main. -->
			{@const mine = data.claim.mine}
			{@const open = mine?.status === 'AWAITING_PROOF' || mine?.status === 'PENDING'}
			<section class="lm-tile lm-tile--flow space-y-3 p-4" aria-labelledby="claim-title">
				<h2 id="claim-title" class="flex items-center gap-2 text-lg font-semibold">
					<Store class="size-5" aria-hidden="true" /> C’est ton lieu ?
				</h2>
				{#if open && mine?.code}
					{#if mine.status === 'PENDING'}
						<p class="text-sm" role="status">
							Demande en cours d’examen : l’équipe vérifie que le code est bien publié. Laisse-le en
							place jusqu’à la réponse.
						</p>
					{:else}
						<p class="text-sm">
							Publie ce code dans la bio du compte Instagram ou Facebook officiel du lieu, ou sur
							une page de son site, puis colle le lien de cette page. Tu pourras le retirer une fois
							la fiche reprise.
						</p>
					{/if}
					<p class="text-sm">
						Ton code :
						<strong class="font-mono text-lg tracking-wider" data-testid="claim-code"
							>{mine.code}</strong
						>
					</p>
					<form
						method="POST"
						action="?/claimProof"
						use:enhance={() =>
							async ({ update }) =>
								update({ reset: false })}
						class="flex flex-col gap-2 sm:flex-row sm:items-end"
					>
						<label class="block flex-1 space-y-1 text-sm font-medium">
							Lien où le code est publié
							<input
								name="proofUrl"
								type="url"
								required
								value={mine.proofUrl ?? ''}
								placeholder="https://www.instagram.com/…"
								class="lm-field w-full"
							/>
						</label>
						<button class="lm-btn"
							>{mine.status === 'PENDING'
								? 'Mettre à jour le lien'
								: 'Envoyer pour vérification'}</button
						>
					</form>
				{:else}
					<p class="text-sm text-muted-foreground">
						Fiche ajoutée par un membre. Si tu gères ce lieu, reprends-la : tu pourras la compléter,
						publier ses dates et accueillir des jams en son nom. Ça ne rapporte pas de points.
					</p>
					{#if mine?.status === 'REJECTED'}
						<p class="rounded-md border border-destructive/50 p-3 text-sm">
							Dernière demande refusée{mine.reason ? ` : ${mine.reason}` : '.'}
						</p>
					{/if}
					{#if data.claim.blocker}
						<p class="text-sm text-muted-foreground">{data.claim.blocker}</p>
					{:else}
						<form method="POST" action="?/claim" use:enhance>
							<button class="lm-btn" data-variant="ghost">C’est mon lieu</button>
						</form>
					{/if}
				{/if}
			</section>
		{/if}

		<details class="lm-tile lm-tile--flow p-3 text-sm">
			<summary class="cursor-pointer text-muted-foreground">Signaler ce lieu</summary>
			<form method="POST" action="?/report" use:enhance class="mt-3 space-y-3">
				<label class="block space-y-1 font-medium">
					Motif
					<select name="reason" required class="lm-field w-full">
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
						class="lm-field w-full"
					></textarea>
				</label>
				<button type="submit" class="lm-btn" data-variant="ghost">Envoyer le signalement</button>
			</form>
		</details>
	</article>
</div>
