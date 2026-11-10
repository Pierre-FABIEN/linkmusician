<script lang="ts">
	// LINKMUSICIAN: fiche d'un studio (P4-03a), voir +page.server.ts. La fiche
	// part en JSON (champ `payload`) : salles et horaires sont des listes.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Circle, CircleCheck, Plus, Trash2 } from 'lucide-svelte';
	import SEO from '#lib/components/SEO.svelte';
	import CommunePicker, {
		type CommuneChoice
	} from '#lib/components/linkmusician/CommunePicker.svelte';
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
	import MediaUpload from '#lib/components/linkmusician/MediaUpload.svelte';
	import { ROLE_LABELS } from '#lib/bands/rules';
	import {
		formatTime,
		MAX_HOURLY_RATE,
		MAX_ROOM_DESCRIPTION,
		MAX_ROOM_NAME,
		MAX_ROOMS,
		MAX_STUDIO_BIO,
		MAX_STUDIO_GEAR,
		MAX_STUDIO_NAME,
		MAX_STUDIO_PHOTOS,
		MAX_STUDIO_PRICING,
		PUBLICATION_GAP_LABELS,
		STUDIO_SERVICE_INFO,
		STUDIO_SERVICES,
		WEEKDAY_LABELS,
		WEEKDAYS,
		type StudioServiceValue
	} from '#lib/studios/rules';

	let { data, form } = $props();

	$effect(() => {
		if (form?.message) toast.success(form.message);
	});

	// Valeurs initiales seulement : la personne modifie ensuite librement.
	// svelte-ignore state_referenced_locally
	const initial = data.studio;
	let name = $state(initial.name);
	let bio = $state(initial.bio ?? '');
	let commune = $state<CommuneChoice | null>(initial.commune);
	let services = $state<StudioServiceValue[]>([...initial.services]);
	let rooms = $state(
		initial.rooms.map((r) => ({
			name: r.name,
			description: r.description,
			hourlyRate: r.hourlyRate === null ? '' : String(r.hourlyRate)
		}))
	);
	let pricingNotes = $state(initial.pricingNotes);
	let gear = $state(initial.gear);
	let byAppointment = $state(initial.byAppointment);
	const savedHours = new Map(initial.hours.map((h) => [h.weekday, h]));
	let hours = $state(
		WEEKDAYS.map((weekday) => {
			const h = savedHours.get(weekday);
			return {
				weekday,
				open: Boolean(h),
				opensAt: h ? formatTime(h.opensAt) : '10:00',
				closesAt: h ? formatTime(h.closesAt) : '19:00'
			};
		})
	);
	if (rooms.length === 0) rooms.push({ name: '', description: '', hourlyRate: '' });

	let saving = $state(false);
	const fieldError = (path: string) =>
		(form as { fields?: Record<string, string> } | null)?.fields?.[path];

	function payload() {
		return JSON.stringify({
			name,
			bio,
			communeCode: commune?.code ?? '',
			services,
			rooms,
			pricingNotes,
			gear,
			byAppointment,
			hours: hours
				.filter((h) => h.open)
				.map(({ weekday, opensAt, closesAt }) => ({ weekday, opensAt, closesAt }))
		});
	}

	const GEAR_PLACEHOLDER = [
		'Console Audient ASP8024',
		'Micros Neumann U87, Shure SM7B',
		'Batterie Gretsch, amplis Fender et Orange'
	].join('\n');
	/** Erreur d'une plage horaire : le serveur numérote les seuls jours ouverts. */
	const hoursError = (weekday: number) =>
		fieldError(`hours.${hours.filter((h) => h.open).findIndex((h) => h.weekday === weekday)}`);

	const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
	/** Ce qu'il faut pour le rang suivant (conception 02 §5). */
	const NEXT_RANK_HINT: Record<string, string> = {
		ACTIVE: '5 sessions confirmées',
		RECOGNIZED: '20 sessions et 10 client·es différent·es',
		ESSENTIAL: '5 sorties vérifiées enregistrées sur place'
	};
	const PHOTO_STATUS: Record<string, string> = {
		PUBLISHED: 'En ligne',
		PENDING_REVIEW: 'En attente de validation',
		PROCESSING: 'En cours',
		REJECTED: 'Refusée'
	};

	const published = $derived(data.studio.publishedAt !== null);
	const input = 'w-full rounded-md border bg-background p-2 text-sm font-normal';
</script>

<SEO title="Fiche de {data.studio.name}" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-4xl space-y-8 rounded-3xl border bg-card p-5 sm:p-8 lg:p-10">
		<header class="space-y-3">
			<a href="/studios" class="text-sm text-muted-foreground underline">← Mes studios</a>
			<h1 class="text-3xl font-black tracking-tight sm:text-4xl">{data.studio.name}</h1>
			{#if data.created}
				<p class="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
					La fiche est créée. Remplis-la, puis publie-la pour que les musicien·nes te trouvent.
				</p>
			{/if}
		</header>

		<!-- Statut : publiée (rang) ou brouillon, avec ce qui manque. -->
		<section aria-labelledby="statut" class="space-y-3 rounded-2xl border p-4 sm:p-5">
			<h2 id="statut" class="sr-only">Statut de la fiche</h2>
			{#if published && data.studio.rank.tier}
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="space-y-1">
						<TierBadge
							id={data.studio.rank.tier.id}
							label={data.studio.rank.tier.label}
							prefix="Rang du studio :"
						/>
						<p class="text-sm text-muted-foreground">
							Visible de tous sur <a href="/@{data.studio.handle}" class="underline"
								>la page du studio</a
							>.
							{plural(data.studio.stats.sessions, 'session confirmée', 'sessions confirmées')}
							avec {plural(data.studio.stats.distinctClients, 'client·e', 'client·es')}.
							{#if data.studio.rank.next}
								Prochain rang : {data.studio.rank.next.label} ({NEXT_RANK_HINT[
									data.studio.rank.next.id
								] ?? ''}).
							{/if}
						</p>
					</div>
					<form method="POST" action="?/unpublish" use:enhance>
						<button class="min-h-11 rounded-full border px-4 text-sm font-semibold hover:bg-muted"
							>Retirer la fiche</button
						>
					</form>
				</div>
			{:else}
				<p class="font-semibold">Brouillon : la fiche n’est visible que de toi.</p>
				{#if data.studio.gaps.length > 0}
					<div class="text-sm text-muted-foreground">
						<p>Pour la publier, il manque :</p>
						<ul class="mt-1 list-disc pl-5">
							{#each data.studio.gaps as gap (gap)}
								<li>{PUBLICATION_GAP_LABELS[gap]}</li>
							{/each}
						</ul>
					</div>
				{:else}
					<form method="POST" action="?/publish" use:enhance>
						<button
							class="min-h-11 w-full rounded-full bg-primary px-4 font-semibold text-primary-foreground sm:w-auto"
							>Publier la fiche</button
						>
					</form>
				{/if}
			{/if}
		</section>

		<!-- Objectifs du studio (P4-03c, conception 08 §6). -->
		<section aria-labelledby="objectifs" class="space-y-3">
			<h2 id="objectifs" class="text-xl font-bold">Objectifs du studio</h2>
			<ol class="space-y-2">
				{#each data.studio.quests as quest (quest.id)}
					<li
						class="flex items-center gap-3 rounded-xl border p-3 {quest.done ? 'opacity-70' : ''}"
					>
						{#if quest.done}
							<CircleCheck class="size-5 shrink-0 text-emerald-600" aria-hidden="true" />
						{:else}
							<Circle class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
						{/if}
						<span class={quest.done ? 'line-through' : ''}>{quest.label}</span>
						<span class="sr-only">{quest.done ? '(fait)' : '(à faire)'}</span>
					</li>
				{/each}
			</ol>
			<p class="text-sm text-muted-foreground">
				Une session, c’est une collaboration (répétition, enregistrement, mixage…) que tu proposes
				dans une conversation en choisissant ce studio, et que ton ou ta client·e confirme.
			</p>
		</section>

		{#if form?.error}
			<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
				{form.error}
			</p>
		{/if}

		<form
			method="POST"
			action="?/save"
			class="space-y-10"
			use:enhance={({ formData }) => {
				formData.set('payload', payload());
				saving = true;
				return async ({ update }) => {
					await update({ reset: false });
					saving = false;
				};
			}}
		>
			<section class="space-y-4" aria-labelledby="identite">
				<h2 id="identite" class="text-xl font-bold">Le studio</h2>
				<label class="block space-y-1 font-medium">
					Nom
					<input
						required
						autocomplete="off"
						maxlength={MAX_STUDIO_NAME}
						bind:value={name}
						class={input}
					/>
				</label>
				<div class="space-y-1">
					<label for="studio-bio" class="block font-medium">Présentation</label>
					<textarea
						id="studio-bio"
						rows="3"
						maxlength={MAX_STUDIO_BIO}
						bind:value={bio}
						placeholder="Ce qui fait votre son, les styles que vous enregistrez, l’ambiance…"
						class={input}
					></textarea>
					<p class="text-right text-xs text-muted-foreground">{[...bio].length}/{MAX_STUDIO_BIO}</p>
				</div>
				<div class="space-y-1">
					<CommunePicker id="studio-commune" label="Ville" bind:chosen={commune} />
					<p class="text-xs text-muted-foreground">
						On n’affiche que la ville, jamais l’adresse : tu la donnes à tes client·es.
					</p>
				</div>
			</section>

			<fieldset class="space-y-3">
				<legend class="text-xl font-bold">Ce que vous proposez</legend>
				<div class="grid gap-2 sm:grid-cols-2">
					{#each STUDIO_SERVICES as service (service)}
						<label
							class="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
						>
							<input type="checkbox" value={service} bind:group={services} class="mt-1 size-4" />
							<span>
								<span class="block font-medium">{STUDIO_SERVICE_INFO[service].label}</span>
								<span class="block text-sm text-muted-foreground"
									>{STUDIO_SERVICE_INFO[service].hint}</span
								>
							</span>
						</label>
					{/each}
				</div>
			</fieldset>

			<section class="space-y-3" aria-labelledby="salles">
				<h2 id="salles" class="text-xl font-bold">Salles et tarifs</h2>
				<ul class="space-y-3">
					{#each rooms as room, i (i)}
						<li class="space-y-2 rounded-xl border p-3">
							<div class="flex flex-col gap-2 sm:flex-row">
								<label class="block flex-1 space-y-1 text-sm font-medium">
									Salle
									<input
										autocomplete="off"
										maxlength={MAX_ROOM_NAME}
										bind:value={room.name}
										placeholder="Salle de prise A"
										aria-invalid={fieldError(`rooms.${i}.name`) ? 'true' : undefined}
										class={input}
									/>
								</label>
								<label class="block space-y-1 text-sm font-medium sm:w-36">
									Tarif à l’heure
									<span class="flex items-center gap-1">
										<input
											inputmode="numeric"
											autocomplete="off"
											maxlength={String(MAX_HOURLY_RATE).length}
											bind:value={room.hourlyRate}
											placeholder="35"
											aria-invalid={fieldError(`rooms.${i}.hourlyRate`) ? 'true' : undefined}
											class={input}
										/>
										<span aria-hidden="true">€</span>
									</span>
								</label>
							</div>
							<label class="block space-y-1 text-sm font-medium">
								En deux mots <span class="font-normal text-muted-foreground">(facultatif)</span>
								<input
									autocomplete="off"
									maxlength={MAX_ROOM_DESCRIPTION}
									bind:value={room.description}
									placeholder="25 m², batterie et amplis fournis"
									class={input}
								/>
							</label>
							{#each ['name', 'hourlyRate', 'description'] as key (key)}
								{#if fieldError(`rooms.${i}.${key}`)}
									<p class="text-sm text-destructive">{fieldError(`rooms.${i}.${key}`)}</p>
								{/if}
							{/each}
							{#if rooms.length > 1}
								<button
									type="button"
									onclick={() => rooms.splice(i, 1)}
									class="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
								>
									<Trash2 class="size-4" aria-hidden="true" />Retirer la salle
								</button>
							{/if}
						</li>
					{/each}
				</ul>
				{#if rooms.length < MAX_ROOMS}
					<button
						type="button"
						onclick={() => rooms.push({ name: '', description: '', hourlyRate: '' })}
						class="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold hover:bg-muted"
					>
						<Plus class="size-4" aria-hidden="true" />Ajouter une salle
					</button>
				{/if}
				<label class="block space-y-1 font-medium">
					Tarifs et conditions <span class="font-normal text-muted-foreground">(facultatif)</span>
					<input
						autocomplete="off"
						maxlength={MAX_STUDIO_PRICING}
						bind:value={pricingNotes}
						placeholder="Ingé son compris · forfait journée 250 € · acompte de 30 %"
						class={input}
					/>
				</label>
			</section>

			<div class="space-y-1">
				<label for="studio-gear" class="block text-xl font-bold">Matériel</label>
				<p class="text-sm text-muted-foreground">Une ligne par élément.</p>
				<textarea
					id="studio-gear"
					rows="5"
					maxlength={MAX_STUDIO_GEAR}
					bind:value={gear}
					placeholder={GEAR_PLACEHOLDER}
					class={input}
				></textarea>
				<p class="text-right text-xs text-muted-foreground">
					{[...gear].length}/{MAX_STUDIO_GEAR}
				</p>
			</div>

			<fieldset class="space-y-3">
				<legend class="text-xl font-bold">Horaires d’ouverture</legend>
				<ul class="divide-y rounded-xl border">
					{#each hours as day (day.weekday)}
						<li class="flex flex-wrap items-center gap-3 p-3">
							<label class="flex min-h-11 w-32 cursor-pointer items-center gap-2 font-medium">
								<input type="checkbox" bind:checked={day.open} class="size-4" />
								{WEEKDAY_LABELS[day.weekday]}
							</label>
							{#if day.open}
								<span class="flex items-center gap-2 text-sm">
									<input
										type="time"
										bind:value={day.opensAt}
										aria-label="{WEEKDAY_LABELS[day.weekday]} : ouverture"
										class="rounded-md border bg-background p-2"
									/>
									à
									<input
										type="time"
										bind:value={day.closesAt}
										aria-label="{WEEKDAY_LABELS[day.weekday]} : fermeture"
										class="rounded-md border bg-background p-2"
									/>
								</span>
							{:else}
								<span class="text-sm text-muted-foreground">Fermé</span>
							{/if}
							{#if day.open && hoursError(day.weekday)}
								<p class="w-full text-sm text-destructive">{hoursError(day.weekday)}</p>
							{/if}
						</li>
					{/each}
				</ul>
				<label class="flex min-h-11 cursor-pointer items-center gap-2">
					<input type="checkbox" bind:checked={byAppointment} class="size-4" />
					Aussi sur rendez-vous, en dehors de ces horaires
				</label>
			</fieldset>

			<div class="sticky bottom-4 z-10">
				<button
					disabled={saving}
					class="min-h-12 w-full rounded-full bg-primary px-4 font-semibold text-primary-foreground shadow-lg disabled:opacity-60"
					>{saving ? 'Enregistrement…' : 'Enregistrer la fiche'}</button
				>
			</div>
		</form>

		<section class="space-y-4 border-t pt-8" aria-labelledby="photos">
			<div class="space-y-1">
				<h2 id="photos" class="text-xl font-bold">
					Photos <span class="text-sm font-normal text-muted-foreground"
						>({data.studio.photos.filter((p) => p.status !== 'REJECTED')
							.length}/{MAX_STUDIO_PHOTOS})</span
					>
				</h2>
				<p class="text-sm text-muted-foreground">
					Les salles, la régie, le matériel : ce que les musicien·nes veulent voir avant de venir.
				</p>
			</div>
			{#if data.studio.photos.length > 0}
				<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{#each data.studio.photos as photo (photo.id)}
						<li class="space-y-1.5">
							{#if photo.fileUrl}
								<img
									src={photo.fileUrl}
									alt={photo.title}
									loading="lazy"
									class="aspect-[4/3] w-full rounded-lg border object-cover"
								/>
							{:else}
								<div class="aspect-[4/3] w-full rounded-lg border bg-muted"></div>
							{/if}
							<p class="truncate text-sm font-medium">{photo.title}</p>
							<p class="text-xs text-muted-foreground">
								{PHOTO_STATUS[photo.status] ?? photo.status}{photo.rejectionReason
									? ` : ${photo.rejectionReason}`
									: ''}
							</p>
							<form method="POST" action="?/deletePhoto" use:enhance>
								<input type="hidden" name="mediaId" value={photo.id} />
								<button
									class="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
								>
									<Trash2 class="size-4" aria-hidden="true" />Retirer<span class="sr-only">
										la photo {photo.title}</span
									>
								</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
			<MediaUpload
				forHandle={data.studio.handle}
				disabled={data.studio.photos.filter((p) => p.status !== 'REJECTED').length >=
					MAX_STUDIO_PHOTOS}
			/>
		</section>

		<!-- Co-gestion (P4-03b). -->
		<section class="space-y-4 border-t pt-8" aria-labelledby="gestion">
			<div class="space-y-1">
				<h2 id="gestion" class="text-xl font-bold">Gestion</h2>
				<p class="text-sm text-muted-foreground">
					Les personnes qui gèrent le studio modifient sa fiche et apparaissent sur sa page pour les
					réservations.
				</p>
			</div>
			{#if form?.teamError}
				<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
					{form.teamError}
				</p>
			{/if}
			<ul class="divide-y rounded-xl border">
				{#each data.studio.team as member (member.membershipId)}
					<li class="flex flex-wrap items-center justify-between gap-3 p-3">
						<div>
							<a href="/@{member.handle}" class="font-medium underline">{member.displayName}</a>
							<span class="text-sm text-muted-foreground">
								· {member.status === 'INVITED'
									? 'invitation envoyée'
									: ROLE_LABELS[member.role]}{member.isMe ? ' (toi)' : ''}
							</span>
						</div>
						{#if member.isMe || data.studio.role === 'OWNER' || member.status === 'INVITED'}
							<form method="POST" action="?/removeManager" use:enhance>
								<input type="hidden" name="membershipId" value={member.membershipId} />
								<button
									class="min-h-11 rounded-full border px-4 text-sm font-semibold hover:bg-muted"
									>{member.isMe
										? 'Quitter la gestion'
										: member.status === 'INVITED'
											? 'Annuler l’invitation'
											: 'Retirer'}</button
								>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
			<form
				method="POST"
				action="?/inviteManager"
				use:enhance={() =>
					async ({ update }) =>
						update({ reset: true })}
				class="flex flex-col gap-3 sm:flex-row sm:items-end"
			>
				<label class="block flex-1 space-y-1 font-medium">
					Inviter à gérer
					<input
						name="handle"
						required
						autocomplete="off"
						value={form?.handle ?? ''}
						placeholder="@nom-d-utilisateur"
						class={input}
					/>
					<span class="block text-xs font-normal text-muted-foreground"
						>Son nom d’utilisateur, sur son profil. Elle ou il doit être ingé son ou
						producteur·rice.</span
					>
				</label>
				<button class="min-h-11 rounded-full border px-5 font-semibold hover:bg-muted"
					>Inviter</button
				>
			</form>
		</section>
	</div>
</div>
