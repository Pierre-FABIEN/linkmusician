<script lang="ts">
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
	import { COLLAB_KINDS, COLLAB_KIND_LABELS, MAX_COLLAB_TITLE } from '#lib/collaborations/rules';

	let { data, form } = $props();
	const c = $derived(data.conversation);
	let body = $state('');
	const chip = 'min-h-11 rounded-full border px-3 text-sm font-semibold hover:border-primary';
	let sending = $state(false);

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
				? `Demande envoyée. Tu pourras écrire à nouveau quand ${c.other.displayName} l'aura acceptée.`
				: c.permission === 'declined'
					? 'Cette demande n’a pas été acceptée. La conversation est fermée.'
					: null
	);
</script>

<SEO title="Messages — {c.other.displayName}" noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<div class="mx-auto max-w-2xl space-y-4">
		<header class="flex items-center gap-3">
			<a
				href="/messages"
				class="grid size-11 place-items-center rounded-full hover:bg-muted"
				aria-label="Retour aux messages"
			>
				<ArrowLeft class="size-5" aria-hidden="true" />
			</a>
			<h1 class="min-w-0 flex-1 truncate text-2xl font-black">
				{#if c.other.handle}
					<a href="/@{c.other.handle}" class="hover:underline">{c.other.displayName}</a>
				{:else}
					{c.other.displayName}
				{/if}
			</h1>
		</header>

		<TipCard tip={data.tip} />

		{#if c.myState === 'REQUEST'}
			<section class="space-y-3 rounded-2xl border bg-card p-4" aria-labelledby="request-title">
				<h2 id="request-title" class="font-semibold">
					{c.other.displayName} veut échanger avec toi
				</h2>
				<p class="text-sm text-muted-foreground">
					Accepte pour lui répondre. Refuser ferme la conversation, sans le lui dire.
				</p>
				<div class="flex gap-2">
					<form method="POST" action="?/accept" use:enhance>
						<button
							class="min-h-11 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
							>Accepter</button
						>
					</form>
					<form method="POST" action="?/decline" use:enhance>
						<button class="min-h-11 rounded-xl border px-4 font-semibold">Refuser</button>
					</form>
				</div>
			</section>
		{/if}

		{#if data.collaborations.length > 0}
			<section class="space-y-2" aria-labelledby="collabs-title">
				<h2 id="collabs-title" class="text-sm font-semibold">Collaborations</h2>
				<ul class="space-y-2" aria-label="Collaborations">
					{#each data.collaborations as k (k.id)}
						<li class="space-y-2 rounded-2xl border bg-card p-3 text-sm">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<span class="font-semibold">{COLLAB_KIND_LABELS[k.kind]} · {k.title}</span>
								<span class="text-muted-foreground"
									>{dayLabel.format(new Date(`${k.happenedOn}T12:00:00Z`))}</span
								>
							</div>
							{#if k.step === 'done'}
								<p class="font-medium text-emerald-700 dark:text-emerald-400">
									Confirmée par vous deux ✓
								</p>
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
										<button
											class="min-h-11 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
											>Confirmer</button
										>
									</form>
									<form method="POST" action="?/respondCollab" use:enhance>
										<input type="hidden" name="collaborationId" value={k.id} />
										<input type="hidden" name="answer" value="no" />
										<button class="min-h-11 rounded-xl border px-4">Ce n'est pas exact</button>
									</form>
								</div>
							{:else if k.step === 'confirm'}
								<p>C'est passé : confirme que ça a bien eu lieu.</p>
								<form method="POST" action="?/confirmCollab" use:enhance>
									<input type="hidden" name="collaborationId" value={k.id} />
									<button
										class="min-h-11 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
										>Confirmer</button
									>
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
			<details class="rounded-2xl border p-3 text-sm">
				<summary class="min-h-11 cursor-pointer content-center font-medium text-primary">
					Vous avez joué ensemble ? Proposer une collaboration
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
						<select name="kind" class="w-full rounded-md border bg-background p-2">
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
							class="w-full rounded-md border bg-background p-2"
						/>
					</label>
					<label class="block space-y-1 font-medium sm:col-span-2">
						Titre
						<input
							name="title"
							required
							maxlength={MAX_COLLAB_TITLE}
							placeholder="Jam funk au local"
							class="w-full rounded-md border bg-background p-2"
						/>
					</label>
					<button
						type="submit"
						class="min-h-11 rounded-xl bg-primary px-4 font-semibold text-primary-foreground sm:w-fit"
						>Proposer</button
					>
				</form>
			</details>
		{/if}

		<ol class="space-y-2" aria-label="Messages">
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
			<form
				method="POST"
				action="?/send"
				class="flex items-end gap-2"
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
						class="w-full resize-y rounded-2xl border bg-background p-3"
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
			<details class="rounded-lg border p-3 text-sm">
				<summary class="cursor-pointer text-muted-foreground">Bloquer {c.other.displayName}</summary
				>
				<p class="mt-2 text-muted-foreground">
					Vous ne pourrez plus vous écrire ni voir vos profils, dans les deux sens. La personne
					n'est pas prévenue. Tu pourras débloquer depuis tes réglages.
				</p>
				<form method="POST" action="?/block" use:enhance class="mt-2">
					<button
						type="submit"
						class="min-h-11 rounded-md border border-destructive/50 px-3 text-destructive"
					>
						Bloquer
					</button>
				</form>
			</details>
		{/if}

		{#if c.other.handle}
			<details class="rounded-lg border p-3 text-sm">
				<summary class="cursor-pointer text-muted-foreground"
					>Signaler {c.other.displayName}</summary
				>
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
							class="w-full rounded-md border bg-background p-2"
						></textarea>
					</label>
					<button type="submit" class="rounded-md border px-3 py-1.5">Envoyer le signalement</button
					>
				</form>
			</details>
		{/if}
	</div>
</div>
