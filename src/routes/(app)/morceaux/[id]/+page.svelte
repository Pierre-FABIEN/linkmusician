<script lang="ts">
	// LINKMUSICIAN: fiche d'un morceau (P3-11), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import DemarcheCard from '#lib/components/linkmusician/demarches/DemarcheCard.svelte';
	import MediaPlayer from '#lib/components/linkmusician/MediaPlayer.svelte';
	import RolePicker from '#lib/components/linkmusician/works/RolePicker.svelte';
	import {
		CORROBORATION_CREDITS,
		MAX_WORK_GENRES,
		MAX_WORK_TITLE,
		craftAnnounceHref
	} from '#lib/works/rules';
	import { WORK_STAGES } from '#lib/collaborations/rules';
	import { plural } from '#lib/jam/log';
	import { Check, Circle, FileDown, Megaphone, Music, PartyPopper, UserPlus } from 'lucide-svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.message) toast.success(form.message);
	});

	const work = $derived(data.work);
	const composed = $derived(work.state === 'COMPOSED');
	const confirmed = $derived(work.credits.filter((c) => c.confirmed).length);
	const ownerHref = $derived(
		work.owner.kind === 'ORGANIZATION' ? `/groupes/${work.owner.handle}` : `/@${work.owner.handle}`
	);
	const STATUS: Record<string, string> = {
		PUBLISHED: 'publiée',
		PENDING_REVIEW: 'en attente de validation',
		PROCESSING: 'en cours',
		REJECTED: 'refusée'
	};
	const day = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Europe/Paris'
	});

	// Valeurs initiales seulement : la personne modifie ensuite librement.
	// svelte-ignore state_referenced_locally
	let genreIds = $state<string[]>(data.work.genres.map((g) => g.id));
	const genresFull = $derived(genreIds.length >= MAX_WORK_GENRES);
	let demoMode = $state<'link' | 'existing'>('link');
	let confirmDelete = $state(false);
	let confirmLeave = $state(false);
</script>

<SEO title={work.title} noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-6xl space-y-8">
		<div class="space-y-2">
			<a href="/morceaux" class="text-sm text-muted-foreground underline">← Mes morceaux</a>
			<h1
				class="flex items-center gap-2 text-3xl font-black tracking-tight break-words sm:text-4xl"
			>
				<Music class="size-7 shrink-0" aria-hidden="true" />
				{work.title}
			</h1>
			<p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
				<span
					class="rounded-full border px-3 py-1 text-xs font-semibold {composed
						? 'border-primary text-primary'
						: 'text-muted-foreground'}"
				>
					{composed ? 'Composé' : 'Idée · visible de l’équipe'}
				</span>
				<span>
					{work.owner.kind === 'ORGANIZATION' ? 'Morceau du groupe' : 'Morceau de'}
					<a href={ownerHref} class="underline">{work.owner.name}</a>
				</span>
				{#if work.genres.length > 0}
					<span class="text-muted-foreground">{work.genres.map((g) => g.name).join(', ')}</span>
				{/if}
			</p>
			{#if composed && work.composedAt}
				<p class="text-sm text-muted-foreground">
					Composé le {day.format(new Date(work.composedAt))}
					{#if work.proof === 'CORROBORATED'}
						· confirmé par {plural(confirmed, 'personne', 'personnes')}
					{/if}
				</p>
			{/if}
			{#if composed}
				<!-- LINKMUSICIAN: étapes de production (P4-06), par collaborations terminées. -->
				<ul class="flex flex-wrap gap-2 text-sm" aria-label="Étapes du morceau">
					{#each WORK_STAGES as stage (stage.field)}
						{@const at = work.stages[stage.field]}
						<li
							class="rounded-full border px-3 py-1 {at
								? 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
								: 'text-muted-foreground'}"
						>
							{stage.label}{at ? ` le ${day.format(new Date(at))}` : ''}
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<DemarcheCard nudge={data.demarche} />

		{#if data.created}
			<div class="flex gap-3 rounded-2xl border border-primary bg-card p-4 text-sm">
				<PartyPopper class="size-5 shrink-0 text-primary" aria-hidden="true" />
				<p>
					Ton idée est notée. Crédite celles et ceux qui la jouent avec toi, joins une maquette,
					puis déclare-la composée.
				</p>
			</div>
		{/if}

		{#if form?.error}
			<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
				{form.error}
			</p>
		{/if}

		{#if work.myCredit && !work.myCredit.confirmed}
			<div class="space-y-3 rounded-2xl border border-primary bg-card p-4">
				<p class="text-sm">
					On te crédite sur ce morceau
					{#if work.credits.find((c) => c.me)?.roles.length}
						({work.credits.find((c) => c.me)?.roles.join(', ')})
					{/if}. Ton nom n’apparaîtra qu’une fois confirmé.
				</p>
				<div class="flex flex-wrap gap-2">
					<form method="POST" action="?/confirm" use:enhance>
						<button
							class="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
							>C’est bien moi</button
						>
					</form>
					<form method="POST" action="?/leave" use:enhance>
						<button class="min-h-11 rounded-full border px-4">Ce n’est pas moi</button>
					</form>
				</div>
			</div>
		{/if}

		{#if work.manage && !composed}
			<section class="space-y-4 rounded-2xl border bg-card p-4" aria-labelledby="compose-title">
				<h2 id="compose-title" class="text-xl font-bold">Prêt à le déclarer composé ?</h2>
				<ul class="grid gap-2 text-sm sm:grid-cols-2">
					<li class="flex items-center gap-2">
						{#if work.demo && work.demo.status !== 'REJECTED'}
							<Check class="size-4 text-primary" aria-hidden="true" />
						{:else}
							<Circle class="size-4 text-muted-foreground" aria-hidden="true" />
						{/if}
						Une maquette jointe (un lien suffit)
					</li>
					<li class="flex items-center gap-2">
						{#if confirmed >= CORROBORATION_CREDITS}
							<Check class="size-4 text-primary" aria-hidden="true" />
						{:else}
							<Circle class="size-4 text-muted-foreground" aria-hidden="true" />
						{/if}
						<span>
							{CORROBORATION_CREDITS} personnes ou plus ont confirmé leur rôle
							<span class="text-muted-foreground"
								>(facultatif : à plusieurs, chacun·e gagne des points)</span
							>
						</span>
					</li>
				</ul>
				<form method="POST" action="?/compose" use:enhance>
					<button
						disabled={Boolean(work.composeBlocker)}
						class="min-h-11 rounded-full bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50"
						>C’est composé</button
					>
				</form>
				{#if work.composeBlocker}
					<p class="text-sm text-muted-foreground">{work.composeBlocker}</p>
				{:else if confirmed < CORROBORATION_CREDITS}
					<p class="text-sm text-muted-foreground">
						Seul·e, le morceau apparaît sur ton profil sans rapporter de points. Si quelqu’un
						confirme son rôle ensuite, vous gagnez des points à ce moment-là.
					</p>
				{/if}
			</section>
		{/if}

		<section class="space-y-3" aria-labelledby="demo-title">
			<h2 id="demo-title" class="text-xl font-bold">Maquette</h2>
			{#if work.demo}
				<div class="space-y-2 rounded-2xl border bg-card p-4">
					<p class="text-sm font-medium">{work.demo.title}</p>
					{#if work.demo.status === 'PUBLISHED'}
						<MediaPlayer media={work.demo} />
					{:else}
						<p class="text-sm text-muted-foreground">
							Maquette {STATUS[work.demo.status] ?? ''}.
							{#if work.demo.status === 'PENDING_REVIEW'}
								Elle s’affichera une fois validée ; le morceau peut déjà être déclaré composé.
							{/if}
						</p>
					{/if}
				</div>
			{:else if !work.manage}
				<p class="text-sm text-muted-foreground">Pas encore de maquette.</p>
			{/if}

			{#if work.manage}
				<details class="rounded-2xl border bg-card p-4" open={!work.demo}>
					<summary class="min-h-11 cursor-pointer content-center font-medium">
						{work.demo ? 'Changer de maquette' : 'Joindre une maquette'}
					</summary>
					<form method="POST" action="?/demo" use:enhance class="mt-3 space-y-3">
						{#if data.candidates.length > 0}
							<div class="flex flex-wrap gap-2 text-sm" role="radiogroup" aria-label="Source">
								<label
									class="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 has-[:checked]:border-primary"
								>
									<input type="radio" bind:group={demoMode} value="link" /> Un lien
								</label>
								<label
									class="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 has-[:checked]:border-primary"
								>
									<input type="radio" bind:group={demoMode} value="existing" /> Un média déjà publié
								</label>
							</div>
						{/if}
						{#if demoMode === 'existing' && data.candidates.length > 0}
							<select
								name="mediaId"
								required
								class="block min-h-11 w-full rounded-md border bg-background px-3"
							>
								{#each data.candidates as m (m.id)}
									<option value={m.id}>{m.title}</option>
								{/each}
							</select>
						{:else}
							<label class="block space-y-1 text-sm">
								<span>Lien YouTube, SoundCloud ou Bandcamp</span>
								<input
									name="url"
									type="url"
									required
									inputmode="url"
									placeholder="https://soundcloud.com/…"
									class="block min-h-11 w-full rounded-md border bg-background px-3"
								/>
							</label>
							<p class="text-xs text-muted-foreground">
								Tant que le morceau est une idée, ce lien ne se voit que de l’équipe.
							</p>
						{/if}
						<button
							class="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
							>Joindre</button
						>
					</form>
				</details>
			{/if}
		</section>

		<section class="space-y-3" aria-labelledby="credits-title">
			<h2 id="credits-title" class="text-xl font-bold">Crédits</h2>
			<ul class="grid gap-2 md:grid-cols-2">
				{#each work.credits as c (c.id)}
					<li
						class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-4"
					>
						<span class="min-w-0">
							{#if c.handle}
								<a href="/@{c.handle}" class="font-semibold underline">{c.name}</a>
							{:else}
								<span class="font-semibold">{c.name}</span>
							{/if}
							<span class="text-sm text-muted-foreground">· {c.roles.join(', ') || '—'}</span>
						</span>
						{#if !c.confirmed}
							<span class="flex items-center gap-2">
								<span class="text-xs text-muted-foreground">en attente de confirmation</span>
								{#if work.manage && !c.me}
									<form method="POST" action="?/withdrawCredit" use:enhance>
										<input type="hidden" name="contributorId" value={c.id} />
										<button class="min-h-11 rounded-full border px-3 text-sm">Retirer</button>
									</form>
								{/if}
							</span>
						{/if}
					</li>
				{/each}
			</ul>

			{#if work.team && composed}
				<p class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
					<a
						href="/morceaux/{work.id}/bulletin"
						download
						data-sveltekit-reload
						class="inline-flex min-h-11 items-center gap-1 font-semibold text-primary underline"
					>
						<FileDown class="size-4" aria-hidden="true" /> Bulletin de partage (PDF)
					</a>
					<span class="text-muted-foreground"
						>Les crédits confirmés et leurs rôles ; les parts se saisissent et se signent à la main.</span
					>
				</p>
			{/if}

			{#if work.manage}
				<details class="rounded-2xl border bg-card p-4">
					<summary class="flex min-h-11 cursor-pointer items-center gap-2 font-medium">
						<UserPlus class="size-4" aria-hidden="true" /> Créditer quelqu’un
					</summary>
					<form method="POST" action="?/credit" use:enhance class="mt-3 space-y-4">
						<label class="block space-y-1 text-sm">
							<span>Son @identifiant</span>
							<input
								name="handle"
								required
								autocomplete="off"
								placeholder="@malik"
								class="block min-h-11 w-full rounded-md border bg-background px-3"
							/>
						</label>
						<RolePicker families={data.families} legend="Son rôle" id="credit" />
						<p class="text-xs text-muted-foreground">
							La personne est prévenue et confirme elle-même : rien n’est public sans son accord.
						</p>
						<button
							class="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
							>Créditer</button
						>
					</form>
				</details>
			{/if}
		</section>

		{#if work.openRoles.length > 0 || work.manage}
			<section class="space-y-3" aria-labelledby="open-title">
				<h2 id="open-title" class="text-xl font-bold">Rôles à pourvoir</h2>
				{#if work.openRoles.length === 0}
					<p class="text-sm text-muted-foreground">
						Il manque quelqu’un ? Ajoute le rôle, puis publie une annonce en un clic.
					</p>
				{:else}
					<ul class="grid gap-2 md:grid-cols-2">
						{#each work.openRoles as r (r.id)}
							<li
								class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-4"
							>
								<span class="font-semibold">{r.label}</span>
								{#if work.manage}
									<span class="flex flex-wrap gap-2">
										{#if r.recruitHref}
											<a
												href={r.recruitHref}
												class="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
											>
												<Megaphone class="size-4" aria-hidden="true" /> Recruter
											</a>
										{/if}
										<form method="POST" action="?/removeRole" use:enhance>
											<input type="hidden" name="roleId" value={r.id} />
											<button class="min-h-11 rounded-full border px-3 text-sm"
												>Retirer {r.label}</button
											>
										</form>
									</span>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
				{#if work.manage}
					<form
						method="POST"
						action="?/openRole"
						use:enhance
						class="space-y-3 rounded-2xl border bg-card p-4"
					>
						<RolePicker
							families={data.families}
							legend="Ajouter un rôle à pourvoir"
							id="open"
							instrumentOnly
						/>
						<button class="min-h-11 rounded-full border px-4 font-medium">Ajouter</button>
					</form>
				{/if}
			</section>
		{/if}

		{#if work.manage && composed}
			<!-- LINKMUSICIAN: la suite du morceau, avec les métiers du son (P4-05). -->
			<section class="space-y-3 rounded-2xl border bg-card p-4" aria-labelledby="suite-title">
				<h2 id="suite-title" class="font-semibold">La suite du morceau</h2>
				<p class="text-sm text-muted-foreground">
					Publie une annonce que seuls les ingés son ou les producteur·rices verront.
				</p>
				<div class="flex flex-wrap gap-2">
					<a
						class="inline-flex min-h-11 items-center rounded-full border px-4 font-medium hover:bg-muted"
						href={craftAnnounceHref({
							workId: work.id,
							workTitle: work.title,
							target: 'SOUND_ENGINEER',
							specialty: 'RECORDING'
						})}>Trouver un·e ingé son</a
					>
					<a
						class="inline-flex min-h-11 items-center rounded-full border px-4 font-medium hover:bg-muted"
						href={craftAnnounceHref({
							workId: work.id,
							workTitle: work.title,
							target: 'PRODUCER',
							specialty: 'PRODUCTION'
						})}>Trouver un·e producteur·rice</a
					>
				</div>
			</section>
		{/if}

		{#if work.manage}
			<details class="rounded-2xl border bg-card p-4">
				<summary class="min-h-11 cursor-pointer content-center font-medium">
					Titre, genres et suppression
				</summary>
				<form method="POST" action="?/edit" use:enhance class="mt-3 space-y-4">
					<label class="block space-y-1 text-sm">
						<span>Titre</span>
						<input
							name="title"
							required
							maxlength={MAX_WORK_TITLE}
							value={work.title}
							class="block min-h-11 w-full rounded-md border bg-background px-3"
						/>
					</label>
					<fieldset class="space-y-2">
						<legend class="text-sm">
							Genres <span class="text-muted-foreground">({genreIds.length}/{MAX_WORK_GENRES})</span
							>
						</legend>
						<div class="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
							{#each data.genres as g (g.id)}
								{#each [g, ...g.children] as item (item.id)}
									<label
										class="inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10"
									>
										<input
											type="checkbox"
											name="genreIds"
											value={item.id}
											bind:group={genreIds}
											disabled={genresFull && !genreIds.includes(item.id)}
										/>
										{item.name}
									</label>
								{/each}
							{/each}
						</div>
					</fieldset>
					<button
						class="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
						>Enregistrer</button
					>
				</form>
				<div class="mt-6 border-t pt-4">
					{#if confirmDelete}
						<form method="POST" action="?/delete" use:enhance class="space-y-2">
							<p class="text-sm">
								Supprimer « {work.title} » pour toute l’équipe ? Les points déjà gagnés restent.
							</p>
							<div class="flex gap-2">
								<button class="min-h-11 rounded-full bg-destructive px-4 font-semibold text-white"
									>Supprimer</button
								>
								<button
									type="button"
									class="min-h-11 rounded-full border px-4"
									onclick={() => (confirmDelete = false)}>Annuler</button
								>
							</div>
						</form>
					{:else}
						<button
							type="button"
							class="min-h-11 text-sm text-destructive underline"
							onclick={() => (confirmDelete = true)}>Supprimer le morceau</button
						>
					{/if}
				</div>
			</details>
		{/if}

		{#if work.myCredit?.confirmed && !work.ownedByMe}
			<div class="text-sm">
				{#if confirmLeave}
					<form method="POST" action="?/leave" use:enhance class="space-y-2">
						<p>Retirer ton nom de ce morceau ? Les points déjà gagnés restent.</p>
						<div class="flex gap-2">
							<button class="min-h-11 rounded-full border border-destructive px-4 text-destructive"
								>Retirer mon crédit</button
							>
							<button
								type="button"
								class="min-h-11 rounded-full border px-4"
								onclick={() => (confirmLeave = false)}>Annuler</button
							>
						</div>
					</form>
				{:else}
					<button
						type="button"
						class="min-h-11 text-muted-foreground underline"
						onclick={() => (confirmLeave = true)}>Retirer mon crédit</button
					>
				{/if}
			</div>
		{/if}
	</div>
</div>
