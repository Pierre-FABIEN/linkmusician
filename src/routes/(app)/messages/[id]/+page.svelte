<script lang="ts">
	import ActivityTimeline from '#lib/components/linkmusician/activity/ActivityTimeline.svelte';
	// LINKMUSICIAN: une conversation (P2-04), voir +page.server.ts.
	import TipCard from '#lib/components/linkmusician/TipCard.svelte';
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import { ArrowLeft, Heart, Send } from 'lucide-svelte';
	import { MAX_MESSAGE_LENGTH } from '#lib/messaging/rules';
	import { REPORT_REASONS, REPORT_REASON_LABELS, MAX_REPORT_DETAILS } from '#lib/moderation/rules';
	import {
		COLLAB_KINDS,
		COLLAB_KIND_LABELS,
		KIND_SERVICE,
		MAX_COLLAB_TITLE
	} from '#lib/collaborations/rules';
	import { isStudioSessionKind } from '#lib/studios/rules';

	let { data, form } = $props();
	const c = $derived(data.conversation);
	let body = $state('');
	const chip = 'min-h-11 rounded-full border px-3 text-sm font-semibold hover:border-primary';
	let sending = $state(false);
	// Collaboration liée au morceau (P4-06) : qui assure la prestation du son.
	// Venu d'un plateau (P5-06) : « Concert » d'office.
	// svelte-ignore state_referenced_locally
	let collabKind = $state<(typeof COLLAB_KINDS)[number]>(
		data.collabForm?.gig.fromPlateau ? 'GIG' : 'REHEARSAL'
	);
	// Concert (P5-07) : « Booké par » propose les bookers confirmé·es du groupe choisi.
	// svelte-ignore state_referenced_locally
	let gigBand = $state(
		data.collabForm?.gig.defaultBand ?? data.collabForm?.gig.bands[0]?.handle ?? ''
	);
	const gigBookers = $derived(
		data.collabForm?.gig.bands.find((b) => b.handle === gigBand)?.bookers ?? []
	);
	const service = $derived(KIND_SERVICE[collabKind] ?? null);
	const can = (who: 'me' | 'other') =>
		Boolean(service && data.collabForm?.tracks[who].includes(service.track));
	const metier = $derived(service?.track === 'PRODUCER' ? 'producteur·rice' : 'ingé son');

	$effect(() => {
		if (form?.error) toast.error(form.error);
		if (form && 'message' in form && form.message) toast.success(form.message);
	});

	/**
	 * Polling léger (D8) : toutes les 15 s, onglet visible seulement, on
	 * demande s'il y a du neuf (une lecture, aucune écriture) ; le fil n'est
	 * rechargé que si c'est le cas.
	 */
	onMount(() => {
		const timer = setInterval(async () => {
			if (document.visibilityState !== 'visible') return;
			const since = c.latestAt ? `?apres=${encodeURIComponent(c.latestAt)}` : '';
			const res = await fetch(`/api/conversations/${c.id}/nouveaux${since}`).catch(() => null);
			if (res?.ok && (await res.json()).fresh) void invalidate('app:conversation');
		}, 15_000);
		return () => clearInterval(timer);
	});

	const time = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	});
	const dayLabel = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short'
	});
	const notice = $derived(
		c.blocked
			? 'Cette conversation est fermée.'
			: c.permission === 'pending'
				? `Tu as envoyé 3 messages. Tu pourras écrire à nouveau quand ${c.other.displayName} t’aura répondu.`
				: c.permission === 'declined'
					? 'Cette demande n’a pas été acceptée. La conversation est fermée.'
					: null
	);
</script>

<SEO title="Messages — {c.other.displayName}" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-5xl space-y-5 lg:space-y-6">
		<header class="flex items-center gap-3">
			<a
				href="/messages"
				class="grid size-11 place-items-center rounded-full hover:bg-muted"
				aria-label="Retour aux messages"
			>
				<ArrowLeft class="size-5" aria-hidden="true" />
			</a>
			<h1 class="lm-title lm-title--sm min-w-0 flex-1 truncate">
				{#if c.other.handle}
					<a href="/@{c.other.handle}" class="hover:underline">{c.other.displayName}</a>
				{:else}
					{c.other.displayName}
				{/if}
			</h1>
		</header>

		<TipCard tip={data.tip} />

		{#if c.myState === 'REQUEST'}
			<section class="lm-tile lm-tile--flow space-y-3 p-4" aria-labelledby="request-title">
				<h2 id="request-title" class="font-semibold">
					{c.other.displayName} t’écrit pour la première fois
				</h2>
				<p class="text-sm text-muted-foreground">
					Réponds pour ouvrir la conversation. Refuser la ferme, sans le lui dire.
				</p>
				<form method="POST" action="?/decline" use:enhance>
					<button class="lm-btn" data-variant="ghost">Refuser</button>
				</form>
			</section>
		{/if}

		{#if data.validationHistory.length > 0}
			<details class="lm-tile lm-tile--flow space-y-3 p-3">
				<summary class="min-h-11 cursor-pointer font-semibold"
					>Journal des validations de collaboration</summary
				>
				<p>
					Les 100 collaborations les plus récentes de cette conversation, y compris annulées.
					Proposer vaut accord ; si la date est passée, proposer ou accepter vaut aussi confirmation
					d’achèvement. Les nouveaux refus de proposition et les annulations explicites sont aussi
					conservés avec leur auteur et leur date. Aucun ancien acte absent n’est reconstitué.
				</p>
				{#each data.validationHistory as journal (journal.id)}
					<ActivityTimeline
						id={`validation-${journal.id}`}
						title={journal.title}
						entries={journal.entries}
					/>
				{/each}
			</details>
		{/if}

		{#if data.collaborations.length > 0}
			<section class="space-y-2" aria-labelledby="collabs-title">
				<h2 id="collabs-title" class="text-sm font-semibold">Collaborations</h2>
				<ul class="space-y-2" aria-label="Collaborations">
					{#each data.collaborations as k (k.id)}
						<li class="lm-tile lm-tile--flow space-y-2 p-3 text-sm">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<span class="font-semibold">{COLLAB_KIND_LABELS[k.kind]} · {k.title}</span>
								{#if k.work}
									<a href="/morceaux/{k.work.id}" class="w-full text-xs underline"
										>Morceau : {k.work.title}</a
									>
								{/if}
								{#if k.provider}
									<span class="w-full text-xs text-muted-foreground"
										>Prestation : {k.provider === 'me' ? 'toi' : k.with}</span
									>
								{/if}
								<span class="text-muted-foreground"
									>{dayLabel.format(new Date(`${k.happenedOn}T12:00:00Z`))}</span
								>
							</div>
							{#if k.step === 'done'}
								<p class="font-medium text-foreground">Confirmée par vous deux ✓</p>
								{#each data.appreciations.byCollab[k.id] ?? [] as p (p.handle)}
									{#if p.given}
										<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
											<p class="inline-flex items-center gap-1 font-semibold text-primary">
												<Heart class="size-3.5" aria-hidden="true" />Tu as apprécié {p.displayName} :
												{p.given}
											</p>
											<form method="POST" action="?/revokeEndorsement" use:enhance>
												<input type="hidden" name="collaborationId" value={k.id} />
												<input type="hidden" name="to" value={p.handle} />
												<button class="min-h-11 text-muted-foreground underline">Reprendre</button>
											</form>
										</div>
									{:else if data.appreciations.canEndorse}
										<form
											method="POST"
											action="?/endorseCollab"
											use:enhance
											class="space-y-2"
											aria-label="Apprécier {p.displayName}"
										>
											<p>Laisse une appréciation à {p.displayName} :</p>
											<input type="hidden" name="collaborationId" value={k.id} />
											<input type="hidden" name="to" value={p.handle} />
											<div class="flex flex-wrap gap-2">
												{#each data.qualities as q (q.value)}
													<button name="quality" value={q.value} class={chip}>{q.label}</button>
												{/each}
												{#each p.instruments as i (i.slug)}
													<button name="instrument" value={i.slug} class={chip}
														>{i.name.toLowerCase()}</button
													>
												{/each}
											</div>
										</form>
									{:else}
										<p class="text-muted-foreground">
											Les appréciations s’ouvrent quand ton compte a un peu d’ancienneté (palier de
											confiance 1).
										</p>
									{/if}
								{/each}
							{:else if k.step === 'respond'}
								<p>{k.with} propose cette collaboration.</p>
								<div class="flex flex-wrap gap-2">
									<form method="POST" action="?/respondCollab" use:enhance>
										<input type="hidden" name="collaborationId" value={k.id} />
										<input type="hidden" name="answer" value="yes" />
										<button class="lm-btn">Confirmer</button>
									</form>
									<form method="POST" action="?/respondCollab" use:enhance>
										<input type="hidden" name="collaborationId" value={k.id} />
										<input type="hidden" name="answer" value="no" />
										<button class="lm-btn" data-variant="ghost">Ce n'est pas exact</button>
									</form>
								</div>
							{:else if k.step === 'confirm'}
								<p>C'est passé : confirme que ça a bien eu lieu.</p>
								<form method="POST" action="?/confirmCollab" use:enhance>
									<input type="hidden" name="collaborationId" value={k.id} />
									<button class="lm-btn">Confirmer</button>
								</form>
							{:else}
								<p class="text-muted-foreground">
									{k.step === 'wait_date'
										? 'Prévue : tu pourras la confirmer une fois passée.'
										: `En attente de la confirmation de ${k.with}.`}
								</p>
								<form method="POST" action="?/cancelCollab" use:enhance>
									<input type="hidden" name="collaborationId" value={k.id} />
									<button class="min-h-11 text-muted-foreground underline">Annuler</button>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if c.permission === 'ok' && c.myState === 'ACCEPTED' && c.other.handle}
			<details class="lm-tile lm-tile--flow p-3 text-sm">
				<summary class="min-h-11 cursor-pointer content-center font-medium text-primary">
					Vous avez joué ou travaillé ensemble ? Proposer une collaboration
				</summary>
				<p class="mt-1 text-muted-foreground">
					Quand vous l'aurez confirmée tous les deux, elle comptera dans vos parcours.
				</p>
				<form
					method="POST"
					action="?/proposeCollab"
					use:enhance
					class="mt-3 grid gap-3 sm:grid-cols-2"
				>
					<label class="block space-y-1 font-medium">
						Type
						<select name="kind" bind:value={collabKind} class="lm-field w-full">
							{#each COLLAB_KINDS as kind (kind)}<option value={kind}
									>{COLLAB_KIND_LABELS[kind]}</option
								>{/each}
						</select>
					</label>
					<label class="block space-y-1 font-medium">
						Date
						<input
							name="happenedOn"
							type="date"
							value={data.today}
							required
							class="lm-field w-full"
						/>
					</label>
					{#if service}
						<fieldset class="space-y-1 sm:col-span-2">
							<legend class="font-medium">Qui assure la prestation ?</legend>
							<div class="flex flex-wrap gap-2">
								{#if !service.required}
									<label
										class="inline-flex min-h-11 items-center gap-2 rounded-full border px-3 has-[:checked]:border-primary"
									>
										<input type="radio" name="provider" value="" checked class="size-4" />
										On enregistre nous-mêmes
									</label>
								{/if}
								<label
									class="inline-flex min-h-11 items-center gap-2 rounded-full border px-3 has-[:checked]:border-primary {can(
										'me'
									)
										? ''
										: 'opacity-50'}"
								>
									<input
										type="radio"
										name="provider"
										value="me"
										disabled={!can('me')}
										class="size-4"
									/>
									Moi
								</label>
								<label
									class="inline-flex min-h-11 items-center gap-2 rounded-full border px-3 has-[:checked]:border-primary {can(
										'other'
									)
										? ''
										: 'opacity-50'}"
								>
									<input
										type="radio"
										name="provider"
										value="other"
										disabled={!can('other')}
										class="size-4"
									/>
									{c.other.displayName}
								</label>
							</div>
							{#if !can('me') && !can('other')}
								<p class="text-muted-foreground">
									Il faut que l'un de vous ait le métier {metier} sur son profil.
								</p>
							{:else}
								<p class="text-muted-foreground">
									La personne qui l'assure gagne sur sa piste de {metier}.
								</p>
							{/if}
						</fieldset>
					{/if}
					{#if data.collabForm && collabKind === 'GIG'}
						<!-- Concert (P5-06) : le groupe qui joue, l'hôte qui l'accueille. -->
						{@const gig = data.collabForm.gig}
						{#if gig.bands.length === 0 || gig.hosts.length === 0}
							<p class="rounded-md border bg-muted/40 p-3 text-sm sm:col-span-2">
								Un concert se confirme entre une personne qui joue dans le groupe et une personne
								qui gère le lieu ou l’organisation qui l’accueille. {gig.bands.length === 0
									? 'Aucun de vous deux ne joue dans un groupe.'
									: 'Aucun de vous deux ne gère un lieu ou une organisation.'}
							</p>
						{:else}
							<label class="block space-y-1 font-medium">
								Groupe
								<select name="band" required class="lm-field w-full" bind:value={gigBand}>
									{#each gig.bands as b (b.handle)}
										<option value={b.handle}>{b.name}</option>
									{/each}
								</select>
							</label>
							<label class="block space-y-1 font-medium">
								Lieu ou organisation
								<select name="host" required class="lm-field w-full">
									{#each gig.hosts as h (h.handle)}
										<option value={h.handle} selected={h.handle === gig.defaultHost}
											>{h.name}{h.verified ? ' (vérifié)' : ''}</option
										>
									{/each}
								</select>
							</label>
							{#if gigBookers.length > 0}
								<!-- Booké par (P5-07) : un·e booker dont le groupe a confirmé l'accompagnement. -->
								<label class="block space-y-1 font-medium sm:col-span-2">
									Booké par (facultatif)
									<select name="booker" class="w-full rounded-md border bg-background p-2">
										<option value="">Personne : on s’est organisés seuls</option>
										{#each gigBookers as bk (bk.handle)}
											<option value={bk.handle}>{bk.name}</option>
										{/each}
									</select>
								</label>
							{/if}
							<p class="text-sm text-muted-foreground sm:col-span-2">
								Confirmé des deux côtés, le concert compte pour le groupe : vérifié si le lieu ou
								l’organisation l’est, corroboré sinon.
							</p>
						{/if}
					{/if}
					{#if data.collabForm && data.collabForm.studios.length > 0 && isStudioSessionKind(collabKind)}
						<!-- Au studio (P4-03c) : une session, une fois confirmée par le ou la client·e. -->
						<label class="block space-y-1 font-medium sm:col-span-2">
							Au studio (facultatif)
							<select name="studio" class="lm-field w-full">
								<option value="">Ailleurs</option>
								{#each data.collabForm.studios as s (s.handle)}
									<option value={s.handle} selected={data.collabForm.studios.length === 1}
										>{s.name}{s.mine ? '' : ` · ${c.other.displayName}`}</option
									>
								{/each}
							</select>
							<span class="block text-sm font-normal text-muted-foreground"
								>Confirmée par le ou la client·e, elle compte comme une session du studio.</span
							>
						</label>
					{/if}
					{#if data.collabForm && data.collabForm.works.length > 0}
						<label class="block space-y-1 font-medium sm:col-span-2">
							Morceau concerné (facultatif)
							<select name="work" class="lm-field w-full">
								<option value="">Aucun</option>
								{#each data.collabForm.works as w (w.id)}
									<option value={w.id} selected={data.collabForm.defaultWork === w.id}
										>{w.title}{w.band ? ` (${w.band})` : ''}{w.mine
											? ''
											: ` · ${c.other.displayName}`}</option
									>
								{/each}
							</select>
						</label>
					{/if}
					<label class="block space-y-1 font-medium sm:col-span-2">
						Titre
						<input
							name="title"
							required
							maxlength={MAX_COLLAB_TITLE}
							placeholder="Jam funk au local"
							class="lm-field w-full"
						/>
					</label>
					<button type="submit" class="lm-btn sm:w-fit">Proposer</button>
				</form>
			</details>
		{/if}

		<ol class="mx-auto w-full max-w-3xl space-y-2" aria-label="Messages">
			{#each c.messages as m (m.id)}
				<li class="flex {m.mine ? 'justify-end' : 'justify-start'}">
					<div
						class="max-w-[85%] rounded-2xl px-4 py-2 {m.mine
							? 'rounded-br-sm bg-primary text-primary-foreground'
							: 'rounded-bl-sm border bg-card'}"
					>
						<p class="break-words whitespace-pre-line">{m.body}</p>
						<p class="mt-1 text-right text-[11px] opacity-75">
							<span class="sr-only">{m.mine ? 'Toi' : c.other.displayName}, </span>{time.format(
								new Date(m.createdAt)
							)}
						</p>
					</div>
				</li>
			{/each}
		</ol>

		{#if notice}
			<p class="rounded-2xl border bg-muted/40 p-3 text-sm">{notice}</p>
		{:else if c.permission === 'ok'}
			{#if c.messagesLeft !== null && c.messagesLeft < 3}
				<p class="text-sm text-muted-foreground">
					En attendant sa réponse, encore {c.messagesLeft} message{c.messagesLeft > 1 ? 's' : ''}.
				</p>
			{/if}
			<form
				method="POST"
				action="?/send"
				class="mx-auto flex w-full max-w-3xl items-end gap-2"
				use:enhance={() => {
					sending = true;
					return async ({ result, update }) => {
						await update({ reset: false });
						if (result.type === 'success') body = '';
						sending = false;
					};
				}}
			>
				<label class="min-w-0 flex-1">
					<span class="sr-only">Ton message</span>
					<textarea
						name="body"
						bind:value={body}
						rows="2"
						maxlength={MAX_MESSAGE_LENGTH}
						required
						placeholder="Écris ton message…"
						class="lm-field w-full resize-y"
					></textarea>
				</label>
				<button
					type="submit"
					disabled={sending || body.trim() === ''}
					class="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
					aria-label="Envoyer"
				>
					<Send class="size-5" aria-hidden="true" />
				</button>
			</form>
		{/if}

		{#if !c.blocked}
			<details class="lm-tile lm-tile--flow p-3 text-sm">
				<summary class="cursor-pointer text-muted-foreground">Bloquer {c.other.displayName}</summary
				>
				<p class="mt-2 text-muted-foreground">
					Vous ne pourrez plus vous écrire ni voir vos profils, dans les deux sens. La personne
					n'est pas prévenue. Tu pourras débloquer depuis tes réglages.
				</p>
				<form method="POST" action="?/block" use:enhance class="mt-2">
					<button type="submit" class="lm-btn" data-variant="danger"> Bloquer </button>
				</form>
			</details>
		{/if}

		{#if c.other.handle}
			<details class="lm-tile lm-tile--flow p-3 text-sm">
				<summary class="cursor-pointer text-muted-foreground"
					>Signaler {c.other.displayName}</summary
				>
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
						<textarea name="details" rows="3" maxlength={MAX_REPORT_DETAILS} class="lm-field w-full"
						></textarea>
					</label>
					<button type="submit" class="lm-btn" data-variant="ghost">Envoyer le signalement</button>
				</form>
			</details>
		{/if}
	</div>
</div>
