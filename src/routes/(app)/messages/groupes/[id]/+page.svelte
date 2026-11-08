<script lang="ts">
	// LINKMUSICIAN: une discussion de groupe (P3-16c), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import { ArrowLeft, MessagesSquare, Send } from 'lucide-svelte';
	import { MAX_MESSAGE_LENGTH } from '#lib/messaging/rules';

	let { data, form } = $props();
	const d = $derived(data.discussion);
	let body = $state('');
	let sending = $state(false);

	$effect(() => {
		if (form && 'error' in form && form.error) toast.error(form.error);
		if (form && 'message' in form && form.message) toast.success(form.message);
	});

	/** Polling léger (D8) : toutes les 15 s, onglet visible, seulement une fois dedans. */
	onMount(() => {
		const timer = setInterval(async () => {
			if (document.visibilityState !== 'visible' || d.access !== 'member') return;
			const since = d.latestAt ? `?apres=${encodeURIComponent(d.latestAt)}` : '';
			const res = await fetch(`/api/discussions/${d.id}/nouveaux${since}`).catch(() => null);
			if (res?.ok && (await res.json()).fresh) void invalidate('app:discussion');
		}, 15_000);
		return () => clearInterval(timer);
	});

	const time = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	});
</script>

<SEO title="Discussion — {d.title}" noindex nofollow />

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
			<div class="min-w-0 flex-1">
				<h1 class="truncate text-2xl font-black">{d.title}</h1>
				<p class="truncate text-sm text-muted-foreground">
					{d.access === 'member' ? `Avec ${d.summary}` : `Discussion de groupe`}
				</p>
			</div>
		</header>

		{#if d.access === 'invitation'}
			<section class="space-y-3 rounded-2xl border bg-card p-5" aria-labelledby="invite-title">
				<MessagesSquare class="size-6 text-primary" aria-hidden="true" />
				<h2 id="invite-title" class="text-lg font-semibold">
					{d.creator.displayName} t’invite à la discussion « {d.title} »
				</h2>
				<p class="text-sm text-muted-foreground">Déjà dedans : {d.summary}.</p>
				<p class="text-sm text-muted-foreground">
					Tu verras les messages une fois que tu l’auras rejointe. Tu pourras la quitter quand tu
					veux. « Non merci » ne prévient personne.
				</p>
				<div class="flex flex-wrap gap-2">
					<form method="POST" action="?/join" use:enhance>
						<button
							class="min-h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
							>Rejoindre</button
						>
					</form>
					<form method="POST" action="?/decline" use:enhance>
						<button class="min-h-11 rounded-xl border px-5 font-semibold">Non merci</button>
					</form>
				</div>
			</section>
		{:else}
			<details class="rounded-2xl border p-3 text-sm">
				<summary class="min-h-11 cursor-pointer content-center font-medium">
					Qui est là ({d.members.length})
				</summary>
				<ul class="mt-2 flex flex-wrap gap-2" aria-label="Membres de la discussion">
					{#each d.members as m (m.id)}
						<li class="rounded-full border px-3 py-1">
							{#if m.handle}<a href="/@{m.handle}" class="hover:underline">{m.displayName}</a
								>{:else}{m.displayName}{/if}
						</li>
					{/each}
				</ul>
				{#if d.invited.length > 0}
					<p class="mt-2 text-muted-foreground">
						Invité·es, pas encore là : {d.invited.map((m) => m.displayName).join(', ')}
					</p>
				{/if}
				{#if d.iAmCreator}
					{#if data.invitable.length > 0}
						<form
							method="POST"
							action="?/invite"
							use:enhance
							class="mt-3 flex flex-wrap items-end gap-2"
						>
							<label class="block space-y-1 font-medium">
								Inviter un contact
								<select name="handle" class="block rounded-md border bg-background p-2">
									{#each data.invitable as c (c.handle)}
										<option value={c.handle}>{c.displayName}</option>
									{/each}
								</select>
							</label>
							<button class="min-h-11 rounded-full border px-4">Inviter</button>
						</form>
					{:else}
						<p class="mt-2 text-muted-foreground">Tous tes contacts sont déjà invités.</p>
					{/if}
				{/if}
			</details>

			{#if d.messages.length === 0}
				<p class="rounded-2xl border bg-muted/40 p-4 text-center text-sm">
					Lance la discussion : propose une date de répète, un morceau à travailler…
				</p>
			{/if}
			<ol class="mx-auto w-full max-w-3xl space-y-2" aria-label="Messages">
				{#each d.messages as m (m.id)}
					<li class="flex {m.mine ? 'justify-end' : 'justify-start'}">
						<div
							class="max-w-[85%] rounded-2xl px-4 py-2 {m.mine
								? 'rounded-br-sm bg-primary text-primary-foreground'
								: 'rounded-bl-sm border bg-card'}"
						>
							{#if !m.mine}
								<p class="text-xs font-semibold text-primary">{m.from.displayName}</p>
							{/if}
							<p class="break-words whitespace-pre-line">{m.body}</p>
							<p class="mt-1 text-right text-[11px] opacity-75">
								<span class="sr-only">{m.mine ? 'Toi' : m.from.displayName}, </span>{time.format(
									new Date(m.createdAt)
								)}
							</p>
						</div>
					</li>
				{/each}
			</ol>

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
					<span class="sr-only">Ton message au groupe</span>
					<textarea
						name="body"
						bind:value={body}
						rows="2"
						maxlength={MAX_MESSAGE_LENGTH}
						required
						placeholder="Écris au groupe…"
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

			<details class="rounded-lg border p-3 text-sm">
				<summary class="cursor-pointer text-muted-foreground">Quitter la discussion</summary>
				<p class="mt-2 text-muted-foreground">
					Tu ne verras plus les messages, et tes messages restent pour les autres. Tu ne pourras pas
					y revenir.
				</p>
				<form method="POST" action="?/leave" use:enhance class="mt-2">
					<button class="min-h-11 rounded-md border px-3">Quitter</button>
				</form>
			</details>
		{/if}
	</div>
</div>
