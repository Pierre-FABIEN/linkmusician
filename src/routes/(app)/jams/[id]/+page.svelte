<script lang="ts">
	// LINKMUSICIAN: fiche d'une jam (P2-14b, P2-14c), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import { Backpack, CalendarDays, Crown, MapPin, Speaker, UserPlus, Users } from 'lucide-svelte';

	let { data, form } = $props();
	const jam = $derived(data.jam);
	const slugOf = $derived(new Map(data.instruments.map((i) => [i.id, i.slug])));
	const reservable = $derived(jam.board.filter((l) => l.reservable));
	const comeDefault = $derived(
		(jam.myInstrumentId ? slugOf.get(jam.myInstrumentId) : jam.packing?.slug) ?? ''
	);

	$effect(() => {
		if (data.published) toast.success('Ta jam est publiée !');
	});
	$effect(() => {
		if (form?.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});
	const when = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Paris'
	});
	const hour = new Intl.DateTimeFormat('fr-FR', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Paris'
	});
	const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;
	const spotLabel = (l: { open: number; reserved: number }) =>
		[
			l.open > 0 ? `${plural(l.open, 'place')} ${l.open > 1 ? 'ouvertes' : 'ouverte'}` : 'Complet',
			l.reserved > 0 ? `${plural(l.reserved, 'réservée')} par le lead` : null
		]
			.filter(Boolean)
			.join(' · ');
	const STATUS_LABELS: Record<string, string> = {
		INVITED: 'en attente',
		ACCEPTED: 'accepté',
		DECLINED: 'refusé'
	};
	const button = 'min-h-11 rounded-xl px-4 font-semibold';
	const primary = `${button} bg-primary text-primary-foreground`;
	const field = 'min-h-11 w-full rounded-md border bg-background px-3 text-sm font-normal';
</script>

<SEO title={jam.title} noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<article class="mx-auto max-w-6xl space-y-6 lg:space-y-8">
		<div class="space-y-2">
			<a href="/jam" class="text-sm text-muted-foreground underline">← Mode jam</a>
			<h1 class="lm-title">{jam.title}</h1>
			<p class="flex items-center gap-2">
				<CalendarDays class="size-4" aria-hidden="true" />
				{when.format(new Date(jam.startsAt))} → {hour.format(new Date(jam.endsAt))}
			</p>
			<p class="flex items-center gap-2">
				<MapPin class="size-4" aria-hidden="true" />
				<a href="/lieux/{jam.venue.id}" class="font-semibold underline">{jam.venue.name}</a>
				· {jam.venue.communeName}
			</p>
			<p class="text-sm text-muted-foreground">
				Hôte : <a href="/@{jam.host.handle}" class="underline">{jam.host.displayName}</a>
				{#if jam.hasDesignatedLead}
					· Lead : <a href="/@{jam.lead.handle}" class="underline">{jam.lead.displayName}</a>
				{/if}
			</p>
		</div>

		{#if data.started}
			<a
				href="/jams/{jam.id}/presents"
				class="flex min-h-11 items-center justify-between rounded-2xl border-2 border-primary bg-card p-4 font-semibold"
			>
				<span>La jam a commencé : tu y es ? Qui est là ?</span>
				<span aria-hidden="true">→</span>
			</a>
		{/if}

		{#if jam.myInvite?.status === 'INVITED'}
			<section
				class="space-y-3 rounded-2xl border-2 border-primary bg-card p-4"
				aria-labelledby="invite-title"
			>
				<h2 id="invite-title" class="font-semibold">
					{jam.lead.displayName} t’invite à jouer : {jam.myInvite.instrument.toLowerCase()}
				</h2>
				<p class="text-sm text-muted-foreground">
					Une place t’est réservée dans la formation. Personne d’autre ne la prendra tant que tu
					n’as pas répondu.
				</p>
				<div class="flex flex-wrap gap-2">
					<form method="POST" action="?/accept" use:enhance>
						<button class={primary}>J’accepte</button>
					</form>
					<form method="POST" action="?/decline" use:enhance>
						<button class="{button} border">Je ne peux pas</button>
					</form>
				</div>
			</section>
		{/if}

		{#if jam.description}<p class="whitespace-pre-line">{jam.description}</p>{/if}

		{#if jam.packing && jam.packing.sentence}
			<section class="lm-tile lm-tile--flow flex gap-3 p-4" aria-labelledby="packing-title">
				<Backpack class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
				<div>
					<h2 id="packing-title" class="font-semibold">
						Quoi apporter ({jam.packing.instrument.toLowerCase()})
					</h2>
					<p class="text-sm">{jam.packing.sentence}</p>
				</div>
			</section>
		{/if}

		{#if jam.board.length > 0}
			<section class="space-y-2" aria-labelledby="spots-title">
				<h2 id="spots-title" class="font-semibold">On cherche</h2>
				<ul class="grid gap-2 sm:grid-cols-2">
					{#each jam.board as l (l.instrumentId)}
						<li class="rounded-xl border p-3 text-sm">
							<span class="font-semibold">{l.name}</span>
							<span class="block text-muted-foreground">{spotLabel(l)}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if jam.lineup.length > 0}
			<section class="space-y-2" aria-labelledby="lineup-title">
				<h2 id="lineup-title" class="font-semibold">La formation</h2>
				<ul class="flex flex-wrap gap-2">
					{#each jam.lineup as m (m.handle)}
						<li class="rounded-full border px-3 py-1 text-sm">
							<a href="/@{m.handle}" class="underline">{m.displayName}</a> · {m.instrument}
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="space-y-2" aria-labelledby="backline-title">
			<h2 id="backline-title" class="flex items-center gap-2 font-semibold">
				<Speaker class="size-4" aria-hidden="true" /> Matériel sur place
			</h2>
			{#if jam.backlineLabels.length === 0}
				<p class="text-sm text-muted-foreground">
					Pas de matériel indiqué : chacun·e apporte le sien.
				</p>
			{:else}
				<ul class="flex flex-wrap gap-2">
					{#each jam.backlineLabels as label (label)}
						<li class="rounded-full border px-3 py-1 text-sm">{label}</li>
					{/each}
				</ul>
			{/if}
			{#if jam.canManage}
				<details class="text-sm">
					<summary class="cursor-pointer font-semibold underline">Ajuster pour cette jam</summary>
					<form method="POST" action="?/backline" use:enhance class="mt-3 space-y-3">
						<fieldset class="grid grid-cols-2 gap-2">
							<legend class="sr-only">Matériel sur place pour cette jam</legend>
							{#each data.backlineOptions as o (o.value)}
								<label class="flex min-h-11 items-center gap-2 rounded-md border px-3">
									<input
										type="checkbox"
										name="backline"
										value={o.value}
										checked={jam.backline.includes(o.value)}
									/>
									{o.label}
								</label>
							{/each}
						</fieldset>
						<button class="{button} border">Enregistrer</button>
					</form>
				</details>
			{/if}
		</section>

		<section class="lm-tile lm-tile--flow space-y-3 p-4">
			<p class="flex items-center gap-2 font-semibold">
				<Users class="size-4" aria-hidden="true" />
				{jam.coming} musicien·ne{jam.coming > 1 ? 's' : ''} vien{jam.coming > 1 ? 'nent' : 't'}
			</p>
			{#if jam.isHost}
				<p class="text-sm text-muted-foreground">C’est ta jam.</p>
			{:else if jam.myInvite?.status === 'INVITED'}
				<p class="text-sm text-muted-foreground">Réponds à l’invitation ci-dessus.</p>
			{:else if jam.imComing}
				<p class="text-sm">
					{jam.myInvite?.status === 'ACCEPTED'
						? 'Tu fais partie de la formation. On compte sur toi !'
						: 'Tu viens. On compte sur toi !'}
				</p>
				<form method="POST" action="?/notComing" use:enhance>
					<button class="{button} border">Je ne viens plus</button>
				</form>
			{:else}
				<p class="text-sm text-muted-foreground">
					Tu peux venir seul·e, sans connaître personne. Après la jam, les présent·es pourront
					s’apprécier.
				</p>
				<form method="POST" action="?/come" use:enhance class="space-y-3">
					<label class="block space-y-1 text-sm font-medium">
						Je joue
						<select name="instrument" class={field}>
							<option value="">Je viens écouter, ou je verrai sur place</option>
							{#each data.instruments as i (i.id)}
								<option value={i.slug} selected={i.slug === comeDefault}>{i.name}</option>
							{/each}
						</select>
					</label>
					<button class={primary}>Je viens</button>
				</form>
			{/if}
		</section>

		{#if jam.canManage}
			<section class="lm-tile lm-tile--flow space-y-4 p-4" aria-labelledby="lead-title">
				<h2 id="lead-title" class="flex items-center gap-2 text-lg font-semibold">
					<UserPlus class="size-4" aria-hidden="true" /> Compose ta formation
				</h2>
				<p class="text-sm text-muted-foreground">
					Invite les musicien·nes de ton choix : leur place est réservée jusqu’à leur réponse. Les
					autres places restent ouvertes à « Je viens ».
				</p>
				{#if reservable.length === 0}
					<p class="text-sm">
						{jam.board.length === 0
							? 'Ta jam ne cherche aucun instrument : rien à réserver.'
							: 'Toutes les places sont réservées.'}
					</p>
				{:else}
					<form method="POST" action="?/invite" use:enhance class="grid gap-3 sm:grid-cols-2">
						<label class="block space-y-1 text-sm font-medium">
							Identifiant
							<input
								name="handle"
								required
								list="network"
								autocomplete="off"
								placeholder="@identifiant"
								class={field}
							/>
							<datalist id="network">
								{#each data.network as h (h)}<option value={h}></option>{/each}
							</datalist>
						</label>
						<label class="block space-y-1 text-sm font-medium">
							Instrument
							<select name="instrument" required class={field}>
								{#each reservable as l (l.instrumentId)}
									<option value={slugOf.get(l.instrumentId)}>{l.name}</option>
								{/each}
							</select>
						</label>
						<button class="{primary} sm:col-span-2">Inviter</button>
					</form>
				{/if}

				{#if jam.pendingInvites.length > 0}
					<ul class="space-y-2">
						{#each jam.pendingInvites as i (i.handle)}
							<li
								class="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm"
							>
								<span>
									<a href="/@{i.handle}" class="font-semibold underline">{i.displayName}</a>
									· {i.instrument} · {STATUS_LABELS[i.status]}
								</span>
								<form method="POST" action="?/cancelInvite" use:enhance>
									<input type="hidden" name="handle" value={i.handle} />
									<button class="min-h-11 px-2 underline">Retirer</button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}

				{#if jam.isHost}
					<details class="text-sm">
						<summary class="flex cursor-pointer items-center gap-2 font-semibold underline">
							<Crown class="size-4" aria-hidden="true" /> Confier le lead à un·e musicien·ne
						</summary>
						<form method="POST" action="?/lead" use:enhance class="mt-3 space-y-3">
							<p class="text-muted-foreground">
								Le lead compose la formation et ajuste le matériel. Laisse vide pour garder le lead.
							</p>
							<label class="block space-y-1 font-medium">
								Identifiant du lead
								<input
									name="handle"
									list="network"
									autocomplete="off"
									placeholder="@identifiant"
									value={jam.hasDesignatedLead ? jam.lead.handle : ''}
									class={field}
								/>
							</label>
							<button class="{button} border">Enregistrer</button>
						</form>
					</details>
				{/if}
			</section>
		{/if}
	</article>
</div>
