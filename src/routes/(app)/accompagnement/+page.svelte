<script lang="ts">
	// LINKMUSICIAN: « Accompagnement » (P5-07), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import {
		AGENT_KIND_INFO,
		MAX_REPRESENTATION_MESSAGE,
		REPRESENTATION_STATUS_LABELS,
		mandateSummary
	} from '#lib/representation/rules';

	let { data, form } = $props();
	let sending = $state(false);
	const dateFormat = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	$effect(() => {
		if (form && 'done' in form && form.done) toast.success(form.done);
		if (form && 'error' in form && form.error) toast.error(form.error);
	});
	const btn = 'min-h-11 rounded-full px-4 text-sm font-semibold';
	const empty = $derived(
		data.requests.length === 0 && data.current.length === 0 && data.kinds.length === 0
	);
</script>

<SEO title="Accompagnement" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-8">
		<MetroPageHeader
			title="Accompagnement"
			intro="Managers et bookers : un accompagnement ne compte qu’une fois confirmé par l’artiste."
		/>

		<a href="/delegations" class="lm-btn" data-variant="ghost">Affectations et délégations</a>
		{#if data.requests.length > 0}
			<section class="space-y-3" aria-labelledby="requests">
				<h2 id="requests" class="text-xl font-bold">Propositions à trancher</h2>
				<ul class="space-y-2">
					{#each data.requests as r (r.id)}
						<li class="space-y-3 rounded-2xl border bg-card p-4">
							<p>
								<a href="/@{r.agent.handle}" class="font-semibold underline">{r.agent.name}</a>
								propose d’accompagner {r.artist ?? 'toi'}
								<strong>{AGENT_KIND_INFO[r.kind].as}</strong>.
							</p>
							<p class="text-sm text-muted-foreground">{mandateSummary(r)}</p>
							<p class="text-sm">Aucun pouvoir de signature ni accès à la gestion du groupe.</p>
							{#if r.message}
								<blockquote class="border-l-2 pl-3 text-sm text-muted-foreground">
									{r.message}
								</blockquote>
							{/if}
							<p class="text-sm text-muted-foreground">
								Confirme seulement si vous travaillez vraiment ensemble : c’est ce qui compte pour
								son parcours. Tu pourras y mettre fin à tout moment. Et en dehors de l’app, fixez
								par écrit la commission, ce qu’elle couvre, la durée et comment on arrête.
							</p>
							<form method="POST" action="?/answer" use:enhance class="flex flex-wrap gap-2">
								<input type="hidden" name="id" value={r.id} />
								<button name="accept" value="1" class="{btn} bg-primary text-primary-foreground"
									>Confirmer</button
								>
								<button name="accept" value="0" class="{btn} border hover:bg-muted">Décliner</button
								>
							</form>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if data.current.length > 0}
			<section class="space-y-3" aria-labelledby="current">
				<h2 id="current" class="text-xl font-bold">Qui m’accompagne</h2>
				<ul class="space-y-2">
					{#each data.current as r (r.id)}
						<li
							class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4"
						>
							<span>
								<a href="/@{r.agent.handle}" class="font-semibold underline">{r.agent.name}</a>
								· {AGENT_KIND_INFO[r.kind].label}{r.artist ? ` de ${r.artist}` : ''}
								{#if r.confirmedAt}
									<span class="block text-sm text-muted-foreground"
										>depuis le {dateFormat.format(new Date(r.confirmedAt))}</span
									>
								{/if}
							</span>
							<p class="w-full text-sm text-muted-foreground">{mandateSummary(r)}</p>
							<form method="POST" action="?/end" use:enhance>
								<input type="hidden" name="id" value={r.id} />
								<button class="{btn} border hover:bg-muted">Mettre fin</button>
							</form>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if data.kinds.length > 0}
			<section class="space-y-3 rounded-2xl border bg-card p-4" aria-labelledby="propose">
				<h2 id="propose" class="text-xl font-bold">Proposer d’accompagner un artiste</h2>
				<p class="text-sm text-muted-foreground">
					Un groupe ou un·e musicien·ne avec qui tu travailles déjà. Sa gestion confirme, et c’est
					affiché sur ton profil.
				</p>
				{#if form && 'proposeError' in form && form.proposeError}
					<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
						{form.proposeError}
					</p>
				{/if}
				<form
					method="POST"
					action="?/propose"
					class="grid gap-3 sm:grid-cols-2"
					use:enhance={() => {
						sending = true;
						return async ({ update }) => {
							await update();
							sending = false;
						};
					}}
				>
					<label class="block space-y-1 font-medium">
						Nom d’utilisateur de l’artiste
						<input
							name="artist"
							required
							autocomplete="off"
							value={(form && 'artist' in form ? form.artist : null) ?? data.artist}
							placeholder="@les-pistons"
							class="w-full rounded-md border bg-background p-2 text-sm font-normal"
						/>
					</label>
					<label class="block space-y-1 font-medium">
						Comme
						<select
							name="kind"
							class="w-full rounded-md border bg-background p-2 text-sm font-normal"
						>
							{#each data.kinds as kind (kind)}
								<option value={kind}>{AGENT_KIND_INFO[kind].label}</option>
							{/each}
						</select>
					</label>
					<label class="block space-y-1 font-medium">
						Début (facultatif)
						<input
							type="date"
							name="startsOn"
							class="w-full rounded-md border bg-background p-2 text-sm font-normal"
						/>
					</label>
					<label class="block space-y-1 font-medium">
						Fin exclue (facultatif)
						<input
							type="date"
							name="expiresOn"
							class="w-full rounded-md border bg-background p-2 text-sm font-normal"
						/>
					</label>
					<label class="block space-y-1 font-medium sm:col-span-2">
						Départements (facultatif)
						<input
							name="departments"
							placeholder="31, 32, 2A"
							aria-describedby="departments-help"
							class="w-full rounded-md border bg-background p-2 text-sm font-normal"
						/>
						<span id="departments-help" class="block text-sm font-normal text-muted-foreground"
							>Codes séparés par des virgules. Vide : tous territoires. L’activité correspond au
							métier choisi : accompagnement de carrière pour un manager, attribution des concerts
							pour un booker.</span
						>
					</label>
					<p class="text-sm text-muted-foreground sm:col-span-2">
						Le périmètre est soumis à l’artiste avant confirmation. Aucun pouvoir de signature. Pour
						modifier le périmètre, terminez l’accompagnement et envoyez une nouvelle proposition.
					</p>
					<label class="block space-y-1 font-medium sm:col-span-2">
						Un mot (facultatif)
						<textarea
							name="message"
							rows="2"
							maxlength={MAX_REPRESENTATION_MESSAGE}
							class="w-full rounded-md border bg-background p-2 text-sm font-normal"
						></textarea>
					</label>
					<button
						disabled={sending}
						class="{btn} bg-primary text-primary-foreground disabled:opacity-60 sm:col-span-2"
						>Envoyer la proposition</button
					>
				</form>
			</section>

			{#if data.mine.length > 0}
				<section class="space-y-3" aria-labelledby="mine">
					<h2 id="mine" class="text-xl font-bold">Les artistes que j’accompagne</h2>
					<ul class="space-y-2">
						{#each data.mine as r (r.id)}
							<li
								class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4"
							>
								<span>
									<a href="/@{r.artist.handle}" class="font-semibold underline">{r.artist.name}</a>
									· {AGENT_KIND_INFO[r.kind].label}
									<span class="block text-sm text-muted-foreground"
										>{REPRESENTATION_STATUS_LABELS[r.status]}{r.status === 'CONFIRMED' &&
										r.confirmedAt
											? ` le ${dateFormat.format(new Date(r.confirmedAt))}`
											: ''}</span
									>
								</span>
								{#if r.status !== 'ENDED'}
									<p class="w-full text-sm text-muted-foreground">{mandateSummary(r)}</p>
									<form method="POST" action="?/end" use:enhance>
										<input type="hidden" name="id" value={r.id} />
										<button class="{btn} border hover:bg-muted"
											>{r.status === 'PROPOSED' ? 'Retirer' : 'Mettre fin'}</button
										>
									</form>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/if}
			<p class="text-sm">
				<a href="/profil/accompagnement" class="font-semibold text-primary underline"
					>Mon profil de manager ou de booker →</a
				>
			</p>
		{/if}

		{#if empty}
			<section class="space-y-3 rounded-2xl border bg-card p-4">
				<p class="text-sm text-muted-foreground">
					Aucun accompagnement pour l’instant. Quand un·e manager ou un·e booker te propose de
					t’accompagner, toi ou ton groupe, la proposition arrive ici.
				</p>
				<a
					href="/reglages/metiers"
					class="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold hover:bg-muted"
					>Tu es manager ou booker ? Ajoute le métier →</a
				>
			</section>
		{/if}
	</div>
</div>
