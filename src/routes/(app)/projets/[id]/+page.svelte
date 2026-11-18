<script lang="ts">
	// LINKMUSICIAN: fiche minimale d'un projet (P2), voir +page.server.ts. Les
	// tuiles par famille, la prochaine action et l'équipe viennent avec U2/U3.
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import MetroChoice from '#lib/components/linkmusician/metro/MetroChoice.svelte';
	import MetroField from '#lib/components/linkmusician/metro/MetroField.svelte';
	import MetroSheet from '#lib/components/linkmusician/metro/MetroSheet.svelte';
	import MetroEmpty from '#lib/components/linkmusician/metro/MetroEmpty.svelte';
	import { Music } from 'lucide-svelte';
	import {
		MAX_PROJECT_DESCRIPTION,
		MAX_PROJECT_NAME,
		MAX_WORKING_TITLE,
		PROJECT_KIND_LABELS,
		PROJECT_KINDS,
		PROJECT_SHARES,
		SHARE_LABELS,
		SHARE_PHRASES,
		type ProjectKindValue,
		type ProjectShareValue
	} from '#lib/projects/rules';

	let { data, form } = $props();
	const p = $derived(data.project);
	const active = $derived(p.status === 'ACTIVE');
	const shares = PROJECT_SHARES.map((value) => ({ value, label: SHARE_LABELS[value] }));
	const kinds = PROJECT_KINDS.map((value) => ({ value, label: PROJECT_KIND_LABELS[value] }));

	// Ranger : le partage proposé suit le morceau choisi ; « Travail » jamais par défaut.
	let workId = $state('');
	let share = $state<ProjectShareValue>('NONE');
	const chosen = $derived(data.rangeable.find((w) => w.id === workId));
	function choose(id: string) {
		workId = id;
		share = data.rangeable.find((w) => w.id === id)?.defaultShare ?? 'NONE';
	}

	// Valeur de départ du formulaire « Modifier » ; le type enregistré y revient.
	let editKind = $state<ProjectKindValue | undefined>(untrack(() => data.project.kind));
	let confirmDelete = $state(false);

	const day = (d: Date | string | null) =>
		d
			? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(d))
			: null;
	const iso = (d: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');
	const when = (d: Date | string) =>
		new Intl.DateTimeFormat('fr-FR', {
			dateStyle: 'short',
			timeStyle: 'short',
			timeZone: 'Europe/Paris'
		}).format(new Date(d));

	const ACTS: Record<string, string> = {
		CREATED: 'Projet créé',
		UPDATED: 'Projet modifié',
		STATUS_CHANGED: 'État changé',
		ITEM_ADDED: 'Morceau rangé',
		ITEM_REMOVED: 'Morceau retiré',
		SHARE_CHANGED: 'Partage changé'
	};
	/** Une ligne de journal, sans tournure à accorder : « Partage changé : « Aube » (Résumé → Travail) ». */
	function line(j: (typeof p.journal)[number]) {
		const what = ACTS[j.kind] ?? j.kind;
		const subject = j.subject ? ` : « ${j.subject} »` : '';
		const more = detail(j);
		return `${what}${subject}${more ? ` (${more})` : ''}`;
	}
	function detail(j: (typeof p.journal)[number]) {
		if (j.kind === 'STATUS_CHANGED') return `${j.fromStatus} → ${j.toStatus}`;
		if (j.kind === 'SHARE_CHANGED' && j.fromShare !== j.toShare)
			return `${j.fromShare} → ${j.toShare}`;
		if (j.kind === 'ITEM_ADDED' && j.toShare) return j.toShare;
		return null;
	}
	const dates = $derived(
		[p.startsOn && `Début : ${day(p.startsOn)}`, p.dueOn && `Échéance : ${day(p.dueOn)}`].filter(
			Boolean
		)
	);
</script>

<SEO title={p.name} noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-8">
		<MetroPageHeader
			kicker={`Projet · ${p.kindLabel}`}
			title={p.name}
			intro={p.description ?? undefined}
		/>
		<ul class="flex flex-wrap gap-2 text-sm" aria-label="Repères du projet">
			<li class="lm-pill">{p.owner.isMe ? 'À moi' : p.owner.name}</li>
			<li class="lm-pill">{p.statusLabel}</li>
			<li class="lm-pill">Je gère</li>
		</ul>
		{#if dates.length > 0}<p class="text-sm text-muted-foreground">{dates.join(' · ')}</p>{/if}

		{#if page.url.searchParams.has('cree') && !form}
			<p role="status" class="text-sm">Projet créé.</p>
		{/if}
		{#if form?.ok}<p role="status" class="text-sm">{form.ok}</p>{/if}
		{#if form?.error}<p role="alert" class="lm-alert p-3 text-sm">{form.error}</p>{/if}

		{#if !active}
			<div
				data-tone="paper"
				class="lm-tile lm-tile--flow flex flex-wrap items-center justify-between gap-3 p-4"
			>
				<p>
					Ce projet est {p.status === 'DONE' ? 'terminé' : 'laissé de côté'} : il se lit sans changer.
				</p>
				<form method="POST" action="?/etat" use:enhance>
					<input type="hidden" name="status" value="ACTIVE" />
					<button class="lm-btn">Rouvrir</button>
				</form>
			</div>
		{/if}

		<section aria-labelledby="morceaux" class="space-y-4">
			<h2 id="morceaux" class="lm-kicker text-muted-foreground">
				Morceaux <span class="text-muted-foreground">· {p.counts.items}</span>
			</h2>
			{#if p.items.length === 0}
				<MetroEmpty
					icon={Music}
					text="Aucun morceau rangé. Le projet ne possède rien : il référence tes morceaux, qui restent à toi."
				/>
			{:else}
				<ul class="space-y-3">
					{#each p.items as item (item.id)}
						<li data-tone="paper" class="lm-tile lm-tile--flow space-y-3 p-4">
							<div class="flex flex-wrap items-baseline justify-between gap-2">
								<p class="font-medium">
									{#if item.href}<a href={item.href} class="underline">{item.title}</a
										>{:else}{item.title}{/if}
									<span class="text-sm text-muted-foreground"> · {item.state}</span>
								</p>
								{#if item.shareLabel}
									<span class="lm-pill text-xs">Partage : {item.shareLabel}</span>
								{/if}
							</div>
							{#if item.manage && item.share}
								<details>
									<summary class="min-h-11 cursor-pointer py-2 text-sm">Changer le partage</summary>
									<form method="POST" action="?/partage" use:enhance class="space-y-3 pt-2">
										<input type="hidden" name="itemId" value={item.id} />
										<fieldset class="space-y-1">
											<legend class="text-sm font-medium"
												>Ce que voient les autres personnes du projet</legend
											>
											{#each PROJECT_SHARES as s (s)}
												<label class="flex min-h-11 items-start gap-2 py-1">
													<input
														type="radio"
														name="share"
														value={s}
														checked={item.share === s}
														class="mt-1"
													/>
													<span
														><span class="font-medium">{SHARE_LABELS[s]}</span>
														<span class="block text-sm text-muted-foreground"
															>{SHARE_PHRASES[s]}</span
														></span
													>
												</label>
											{/each}
										</fieldset>
										<MetroField
											id={`titre-${item.id}`}
											label="Titre affiché aux autres"
											help="À la place du vrai titre, par exemple « Titre 3 »."
											optional
										>
											{#snippet children(attrs)}
												<input
													{...attrs}
													name="workingTitle"
													maxlength={MAX_WORKING_TITLE}
													value={item.workingTitle ?? ''}
												/>
											{/snippet}
										</MetroField>
										<button class="lm-btn">Enregistrer le partage</button>
									</form>
								</details>
							{/if}
							{#if item.manage || active}
								<form method="POST" action="?/retirer" use:enhance>
									<input type="hidden" name="itemId" value={item.id} />
									<button class="lm-btn" data-variant="ghost"
										>Retirer du projet<span class="sr-only"> : {item.title}</span></button
									>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			{#if active}
				{#if data.rangeable.length > 0}
					<form
						method="POST"
						action="?/ranger"
						use:enhance
						data-tone="paper"
						class="lm-tile lm-tile--flow space-y-4 p-4"
					>
						<h3 class="font-medium">Ranger un de mes morceaux</h3>
						<MetroField
							id="workId"
							label="Morceau à ranger"
							help="Seulement les morceaux que tu gères."
						>
							{#snippet children(attrs)}
								<select
									{...attrs}
									name="workId"
									required
									value={workId}
									onchange={(e) => choose(e.currentTarget.value)}
								>
									<option value="" disabled>Choisir…</option>
									{#each data.rangeable as w (w.id)}
										<option value={w.id}
											>{w.title} · {w.state}{w.owner ? ` · ${w.owner}` : ''}</option
										>
									{/each}
								</select>
							{/snippet}
						</MetroField>
						<fieldset class="space-y-2">
							<legend class="text-sm font-medium"
								>Ce que voient les autres personnes du projet</legend
							>
							<MetroChoice options={shares} bind:value={share} label="Partage" name="share" />
							<p class="text-sm text-muted-foreground">{SHARE_PHRASES[share]}</p>
							{#if chosen && chosen.state === 'Idée' && share !== 'NONE'}
								<p class="text-sm">
									Son titre sera visible. Tu peux afficher un titre de travail à la place.
								</p>
							{/if}
						</fieldset>
						<MetroField id="workingTitle" label="Titre affiché aux autres" optional>
							{#snippet children(attrs)}
								<input {...attrs} name="workingTitle" maxlength={MAX_WORKING_TITLE} />
							{/snippet}
						</MetroField>
						<button class="lm-btn">Ranger</button>
					</form>
				{:else}
					<p class="text-sm text-muted-foreground">
						Tous tes morceaux sont rangés ici, ou tu n’en as pas encore.
						<a href="/morceaux/nouveau" class="underline">Noter une idée de morceau</a>
					</p>
				{/if}
			{/if}
		</section>

		<section aria-labelledby="journal" class="space-y-3">
			<h2 id="journal" class="lm-kicker text-muted-foreground">Journal</h2>
			<ul class="space-y-2 text-sm">
				{#each p.journal as j (j.id)}
					<li>
						{line(j)}
						<span class="text-muted-foreground"> · {j.author} · {when(j.occurredAt)}</span>
					</li>
				{/each}
			</ul>
		</section>

		<section aria-labelledby="gestion" class="space-y-4">
			<h2 id="gestion" class="lm-kicker text-muted-foreground">Gérer le projet</h2>
			{#if active}
				<details>
					<summary class="min-h-11 cursor-pointer py-2 text-sm font-medium"
						>Modifier le projet</summary
					>
					<form method="POST" action="?/modifier" use:enhance class="space-y-4 pt-2">
						<MetroField id="edit-name" label="Nom du projet">
							{#snippet children(attrs)}
								<input
									{...attrs}
									name="name"
									required
									minlength="2"
									maxlength={MAX_PROJECT_NAME}
									value={p.name}
								/>
							{/snippet}
						</MetroField>
						<fieldset class="space-y-2">
							<legend class="text-sm font-medium">C’est quoi ?</legend>
							<MetroChoice
								options={kinds}
								bind:value={editKind}
								label="Type de projet"
								name="kind"
							/>
						</fieldset>
						<MetroField id="edit-description" label="Objectif en une phrase" optional>
							{#snippet children(attrs)}
								<textarea {...attrs} name="description" rows="2" maxlength={MAX_PROJECT_DESCRIPTION}
									>{p.description ?? ''}</textarea
								>
							{/snippet}
						</MetroField>
						<div class="grid gap-4 sm:grid-cols-2">
							<MetroField id="edit-startsOn" label="Début" optional>
								{#snippet children(attrs)}
									<input {...attrs} type="date" name="startsOn" value={iso(p.startsOn)} />
								{/snippet}
							</MetroField>
							<MetroField id="edit-dueOn" label="Échéance" optional>
								{#snippet children(attrs)}
									<input {...attrs} type="date" name="dueOn" value={iso(p.dueOn)} />
								{/snippet}
							</MetroField>
						</div>
						<button class="lm-btn">Enregistrer</button>
					</form>
				</details>
				<div class="flex flex-wrap gap-3">
					<form method="POST" action="?/etat" use:enhance>
						<input type="hidden" name="status" value="DONE" />
						<button class="lm-btn" data-variant="ghost">Marquer comme atteint</button>
					</form>
					<form method="POST" action="?/etat" use:enhance>
						<input type="hidden" name="status" value="ABANDONED" />
						<button class="lm-btn" data-variant="ghost">Laisser de côté</button>
					</form>
				</div>
			{/if}
			<button
				type="button"
				class="lm-btn"
				data-variant="ghost"
				onclick={() => (confirmDelete = true)}
			>
				Supprimer le projet
			</button>
		</section>
	</div>
</div>

<MetroSheet bind:open={confirmDelete} title="Supprimer ce projet ?">
	<div class="space-y-4">
		<p>
			Les morceaux rangés restent intacts, avec leurs crédits et leur maquette. Seuls le projet, ses
			liens et son journal disparaissent.
		</p>
		<form method="POST" action="?/supprimer" class="flex flex-wrap justify-end gap-3">
			<button
				type="button"
				class="lm-btn"
				data-variant="ghost"
				onclick={() => (confirmDelete = false)}>Annuler</button
			>
			<button class="lm-btn">Supprimer le projet</button>
		</form>
	</div>
</MetroSheet>
