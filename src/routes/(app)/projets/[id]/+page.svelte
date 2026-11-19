<script lang="ts">
	// LINKMUSICIAN: fiche d'un projet (P2 ; présentation U2), voir
	// +page.server.ts. Un socle, trois compositions (conception 20 §7.2) : seul
	// l'ordre des blocs change selon la famille. Une seule prochaine action,
	// calculée par le serveur ; aucune action d'un lot à venir (tâches P13,
	// concerts) n'a de bouton. P4a : bloc « Équipe » minimal (U3 le complétera) ;
	// chaque bouton n'apparaît qu'à qui peut agir, et le serveur relit tout.
	import { tick, untrack } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { anchorLinks, scrollToId } from '#lib/components/linkmusician/aide/anchors';
	import Tile from '#lib/components/linkmusician/metro/Tile.svelte';
	import { TONE_OF, toneOfMode } from '#lib/components/linkmusician/metro/tones';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import MetroChoice from '#lib/components/linkmusician/metro/MetroChoice.svelte';
	import MetroField from '#lib/components/linkmusician/metro/MetroField.svelte';
	import MetroSheet from '#lib/components/linkmusician/metro/MetroSheet.svelte';
	import MetroEmpty from '#lib/components/linkmusician/metro/MetroEmpty.svelte';
	import {
		ArrowRight,
		CalendarDays,
		Check,
		Clock,
		Megaphone,
		Music,
		Pencil,
		Plus,
		Search,
		Target,
		UserPlus,
		UsersRound,
		X
	} from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import {
		askToInvite,
		bulkInviteSummary,
		CAPABILITY_LABELS,
		COORDINATE_ADULTS_ONLY,
		INVITE_PREVIEW,
		matchCandidate,
		PRESETS,
		removalEffects,
		type ProjectCapabilityValue
	} from '#lib/projects/participants';
	import { plural } from '#lib/jam/log';
	import {
		addLabel,
		MAX_NEED_DESCRIPTION,
		NEED_SPECIALTIES,
		NEED_TRACK_LABELS,
		NEED_TRACKS,
		type NeedTrackValue
	} from '#lib/projects/needs';
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
	const can = $derived(p.can);
	/** Gestion ou coordination : dates, phrase, ranger ses morceaux, inviter. */
	const organise = $derived(active && can.live && (can.manage || can.coordinate));
	const activeTeam = $derived(p.team.filter((m) => m.status === 'ACTIVE'));
	const shares = PROJECT_SHARES.map((value) => ({ value, label: SHARE_LABELS[value] }));
	const kinds = PROJECT_KINDS.map((value) => ({ value, label: PROJECT_KIND_LABELS[value] }));

	// Ranger : le partage proposé suit le morceau choisi ; « Travail » jamais par défaut.
	let workId = $state(untrack(() => data.preselect ?? ''));
	let share = $state<ProjectShareValue>(
		untrack(() => data.rangeable.find((w) => w.id === data.preselect)?.defaultShare ?? 'NONE')
	);
	const chosen = $derived(data.rangeable.find((w) => w.id === workId));
	function choose(id: string) {
		workId = id;
		share = data.rangeable.find((w) => w.id === id)?.defaultShare ?? 'NONE';
	}

	// Valeur de départ du formulaire « Modifier » ; le type enregistré y revient.
	let editKind = $state<ProjectKindValue | undefined>(untrack(() => data.project.kind));
	let confirmDelete = $state(false);
	let editOpen = $state(false);

	// U3 : équipe. Feuilles « Inviter », « Inviter les membres », retrait et départ.
	let inviteOpen = $state(false);
	let inviteRole = $state('');
	let membersOpen = $state(false);
	let sending = $state<'inviter' | 'membres' | 'retrait' | null>(null);
	let leaving = $state<{
		id: string;
		name: string;
		self: boolean;
		invited: boolean;
		coordinate: boolean;
	} | null>(null);
	let query = $state('');
	let pick = $state('');
	let handle = $state('');
	let byHandle = $state(false);
	let preset = $state<'participant' | 'coordinator'>('participant');
	const candidates = $derived(data.invite.candidates);
	// La personne choisie reste affichée même si la recherche ne la retient plus.
	const shown = $derived(candidates.filter((c) => c.id === pick || matchCandidate(c, query)));
	const chosenPerson = $derived(candidates.find((c) => c.id === pick));
	const members = $derived(candidates.filter((c) => c.member));
	function choosePerson(id: string) {
		pick = id;
		handle = '';
		if (!candidates.find((c) => c.id === id)?.canCoordinate) preset = 'participant';
	}
	function resetInvite() {
		query = '';
		pick = '';
		handle = '';
		byHandle = false;
		preset = 'participant';
		inviteRole = '';
	}
	/** Après « Transformer en projet » : le bilan des invitations (U3). */
	function createdMessage(params: { has(k: string): boolean; get(k: string): string | null }) {
		if (!params.has('invites')) return 'Projet créé.';
		const invited = Number(params.get('invites')) || 0;
		const skipped = Number(params.get('sans')) || 0;
		return `Projet créé. ${bulkInviteSummary({ invited, skipped, quota: null })}`;
	}
	/** Une cible de la fiche qui ouvre une feuille ou un repli. */
	function openTarget(target: string) {
		if (target === 'modifier') editOpen = true;
		if (target === 'inviter' && organise) inviteOpen = true;
	}

	/** Les cibles de la fiche elle-même (`#ranger`, `#modifier`, `#morceaux`). */
	const local = $derived(data.next.href.startsWith(`/projets/${data.project.id}#`));
	async function goLocal(event: MouseEvent) {
		const target = data.next.href.split('#')[1];
		event.preventDefault();
		openTarget(target);
		await tick();
		scrollToId(target);
	}
	afterNavigate(({ to }) => {
		const hash = to?.url.hash.slice(1);
		if (!hash) return;
		openTarget(hash);
		setTimeout(() => scrollToId(decodeURIComponent(hash)), 50);
	});

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

	const NEED_ACTS: Record<string, string> = {
		NEED_PROPOSED: 'Besoin proposé',
		NEED_OPENED: 'Besoin ouvert',
		NEED_DECLINED: 'Besoin non retenu',
		NEED_UPDATED: 'Besoin modifié',
		NEED_FILLED: 'Besoin pourvu',
		NEED_REOPENED: 'Besoin rouvert',
		NEED_CANCELLED: 'Besoin annulé',
		NEED_LINKED: 'Annonce préparée'
	};
	const ACTS: Record<string, string> = {
		CREATED: 'Projet créé',
		UPDATED: 'Projet modifié',
		STATUS_CHANGED: 'État changé',
		ITEM_ADDED: 'Morceau rangé',
		ITEM_REMOVED: 'Morceau retiré',
		SHARE_CHANGED: 'Partage changé',
		INVITED: 'Invitation',
		JOINED: 'Arrivée dans le projet',
		DECLINED: 'Invitation refusée',
		LEFT: 'Départ du projet',
		REMOVED: 'Retrait du projet',
		CAPABILITY_GRANTED: 'Capacité acceptée',
		CAPABILITY_REVOKED: 'Capacité retirée',
		...NEED_ACTS
	};
	/** Une ligne de journal, sans tournure à accorder : « Partage changé : « Aube » (Résumé → Travail) ». */
	function line(j: (typeof p.journal)[number]) {
		const what = ACTS[j.kind] ?? j.kind;
		const subject = j.subject ? ` : « ${j.subject} »` : j.person ? ` : ${j.person}` : '';
		const more = detail(j);
		return `${what}${subject}${more ? ` (${more})` : ''}`;
	}
	function detail(j: (typeof p.journal)[number]) {
		if (j.kind === 'STATUS_CHANGED') return `${j.fromStatus} → ${j.toStatus}`;
		if (j.kind === 'SHARE_CHANGED' && j.fromShare !== j.toShare)
			return `${j.fromShare} → ${j.toShare}`;
		if (j.kind === 'ITEM_ADDED' && j.toShare) return j.toShare;
		if (j.capability)
			return CAPABILITY_LABELS[j.capability as ProjectCapabilityValue] ?? j.capability;
		return null;
	}
	const dates = $derived(
		[p.startsOn && `Début : ${day(p.startsOn)}`, p.dueOn && `Échéance : ${day(p.dueOn)}`].filter(
			Boolean
		)
	);
	const itemsTitle = $derived(data.family === 'other' ? 'Éléments' : 'Morceaux');

	// U3b-c : besoins. Une feuille pour ajouter (ou proposer) et modifier ; la
	// précision suit le métier choisi. Les droits viennent du serveur (`actions`).
	type Need = (typeof p.needs)[number];
	const NEEDS_SHOWN = 5;
	let allNeeds = $state(false);
	let needSheetOpen = $state(false);
	let needSending = $state(false);
	let editing = $state<Need | null>(null);
	let needTrack = $state<NeedTrackValue>('SOUND_ENGINEER');
	let needSpecialty = $state('');
	let needInstrument = $state('');
	let needDescription = $state('');
	const needSpecialties = $derived(NEED_SPECIALTIES[needTrack]);
	/** Gestion ou coordination d'un projet en cours : ajouter ou proposer. */
	const canAddNeed = $derived(organise);
	const pendingNeeds = $derived(p.needs.filter((n) => n.status === 'PROPOSED'));
	const openNeeds = $derived(p.needs.filter((n) => n.status === 'OPEN').length);
	const shownNeeds = $derived(allNeeds ? p.needs : p.needs.slice(0, NEEDS_SHOWN));
	function openNeedSheet(need: Need | null) {
		editing = need;
		needTrack = need?.track ?? 'SOUND_ENGINEER';
		needSpecialty = need?.specialty ?? '';
		needInstrument = need?.instrumentSlug ?? '';
		needDescription = need?.description ?? '';
		needSheetOpen = true;
	}
	/** « Inviter » depuis un besoin : la feuille de U3, rôle prérempli (Q98). */
	function inviteFor(label: string) {
		resetInvite();
		inviteRole = label;
		inviteOpen = true;
	}
</script>

<SEO title={p.name} noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10" use:anchorLinks>
	<div class="mx-auto max-w-3xl space-y-8">
		<MetroPageHeader
			kicker={`Projet · ${p.kindLabel}`}
			title={p.name}
			intro={p.description ?? undefined}
		/>
		<ul class="flex flex-wrap gap-2 text-sm" aria-label="Repères du projet">
			<li class="lm-pill">{p.owner.isMe ? 'À moi' : p.owner.name}</li>
			<li class="lm-pill">{p.statusLabel}</li>
			<li class="lm-pill" data-testid="project-role">{p.roleLabel}</li>
		</ul>
		<p class="text-sm text-muted-foreground">
			{[data.progress, ...(data.family === 'stage' ? [] : dates)].join(' · ')}
		</p>

		{#if page.url.searchParams.has('cree') && !form}
			<p role="status" class="text-sm">{createdMessage(page.url.searchParams)}</p>
		{/if}
		{#if page.url.searchParams.has('rejoint') && !form}
			<p role="status" class="text-sm">
				Bienvenue dans « {p.name} » : voici ce qui est partagé avec toi.
			</p>
		{/if}
		{#if form?.ok}<p role="status" class="text-sm">{form.ok}</p>{/if}
		{#if form?.error && !(form.action === 'inviter' && inviteOpen) && !(needSheetOpen && (form.action === 'besoin-ajouter' || form.action === 'besoin-modifier'))}
			<p role="alert" class="lm-alert p-3 text-sm">{form.error}</p>
		{/if}

		{#if !active}
			<div
				data-tone="paper"
				class="lm-tile lm-tile--flow flex flex-wrap items-center justify-between gap-3 p-4"
			>
				<p>
					Ce projet est {p.status === 'DONE' ? 'terminé' : 'laissé de côté'} : il se lit sans changer.
				</p>
				{#if can.manage}
					<form method="POST" action="?/etat" use:enhance>
						<input type="hidden" name="status" value="ACTIVE" />
						<button class="lm-btn">Rouvrir</button>
					</form>
				{/if}
			</div>
		{:else if !can.live}
			<div data-tone="paper" class="lm-tile lm-tile--flow p-4">
				<p>Le groupe qui portait ce projet n’existe plus : le projet se lit sans changer.</p>
			</div>
		{:else}
			<!-- Prochaine action : une seule, et seulement ce que je peux faire. -->
			<Tile tone={toneOfMode('CAREER')} icon={Target} data-testid="project-next">
				<section class="space-y-3" aria-labelledby="prochaine-action">
					<p class="lm-tile__kicker">Prochaine action</p>
					<h2 id="prochaine-action" class="lm-title lm-title--sm wrap-break-word">
						{data.next.label}
					</h2>
					<p class="lm-tile__text max-w-prose">{data.next.text}</p>
					{#if !(p.role === 'participate' && data.next.kind === 'consult')}<a
							href={data.next.href}
							class="lm-btn"
							onclick={local ? goLocal : undefined}
							data-sveltekit-noscroll={local || undefined}
							>J’y vais<ArrowRight class="size-4" aria-hidden="true" /></a
						>{/if}
				</section>
			</Tile>
		{/if}

		{#each data.blocks as block (block)}
			{#if block === 'items'}{@render itemsBlock()}{:else if block === 'dates'}{@render datesBlock()}{:else}{@render journalBlock()}{/if}
		{/each}

		<!-- Ce qui viendra, dit sans bouton (P4, P13) : aucune fausse action. -->
		<div data-tone="paper" class="lm-tile lm-tile--flow space-y-2 p-4 text-sm">
			<p class="flex items-center gap-2 font-medium">
				<Clock class="size-4" aria-hidden="true" /> Bientôt dans un projet
			</p>
			<p class="text-muted-foreground">
				Confier des tâches, y ranger des concerts et des annonces.
			</p>
		</div>

		{@render needsBlock()}

		{@render teamBlock()}

		{#if can.manage || organise}
			<section aria-labelledby="gestion" class="space-y-4">
				<h2 id="gestion" class="lm-kicker text-muted-foreground">
					{can.manage ? 'Gérer le projet' : 'Coordonner le projet'}
				</h2>
				{#if organise}
					<details id="modifier" bind:open={editOpen}>
						<summary class="min-h-11 cursor-pointer py-2 text-sm font-medium"
							>Modifier le projet</summary
						>
						<form method="POST" action="?/modifier" use:enhance class="space-y-4 pt-2">
							{#if !can.manage}
								<!-- Coordination : nom et type restent ceux de la gestion (le serveur refuse tout changement). -->
								<input type="hidden" name="name" value={p.name} />
								<input type="hidden" name="kind" value={p.kind} />
							{:else}
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
							{/if}
							<MetroField id="edit-description" label="Objectif en une phrase" optional>
								{#snippet children(attrs)}
									<textarea
										{...attrs}
										name="description"
										rows="2"
										maxlength={MAX_PROJECT_DESCRIPTION}>{p.description ?? ''}</textarea
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
				{/if}
				{#if can.manage && active}
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
				{#if can.manage}
					<button
						type="button"
						class="lm-btn"
						data-variant="ghost"
						onclick={() => (confirmDelete = true)}
					>
						Supprimer le projet
					</button>
				{/if}
			</section>
		{/if}
	</div>
</div>

{#snippet teamBlock()}
	<section id="equipe" aria-labelledby="equipe-titre" class="space-y-4">
		<h2 id="equipe-titre" class="lm-kicker text-muted-foreground">
			Équipe <span class="text-muted-foreground">· {activeTeam.length + 1}</span>
		</h2>
		{#if p.me && p.me.proposed.length > 0}
			<div
				data-tone="paper"
				class="lm-tile lm-tile--flow space-y-3 p-4"
				data-testid="capability-offer"
			>
				<p class="font-medium">On te propose : {p.me.proposed.join(', ')}</p>
				<p class="text-sm text-muted-foreground">{PRESETS.coordinator.phrase}</p>
				<div class="flex flex-wrap gap-3">
					<form method="POST" action="?/capacite" use:enhance>
						<input type="hidden" name="answer" value="accept" />
						<button class="lm-btn">Accepter</button>
					</form>
					<form method="POST" action="?/capacite" use:enhance>
						<input type="hidden" name="answer" value="decline" />
						<button class="lm-btn" data-variant="ghost">Non merci</button>
					</form>
				</div>
			</div>
		{/if}
		<ul class="lm-tile lm-tile--flow lm-list" aria-label="Personnes du projet">
			<!-- La gestion du porteur : jamais retirée d'ici, jamais « invitée ». -->
			<li class="lm-list__row flex-wrap justify-between" data-testid="team-owner">
				<span class="min-w-0 font-medium wrap-break-word"
					>{p.owner.isMe ? 'Toi' : p.owner.name}</span
				>
				<span class="lm-pill text-xs">Gère le projet</span>
			</li>
			{#each p.team as m (m.id)}
				<li class="lm-list__row flex-col items-stretch gap-2" data-testid="team-member">
					<div class="flex flex-wrap items-baseline justify-between gap-2">
						<p class="min-w-0 font-medium wrap-break-word">
							{m.isMe ? 'Toi' : m.name}{#if m.role}<span class="text-sm text-muted-foreground">
									· {m.role}</span
								>{/if}
						</p>
						<span class="flex flex-wrap gap-1 text-xs">
							{#if m.status === 'INVITED'}<span class="lm-pill">Invitation en attente</span
								>{:else if m.coordinate}<span class="lm-pill">Coordination</span>{:else}<span
									class="lm-pill">Participation</span
								>{/if}
							{#if m.proposed}<span class="lm-pill">Coordination proposée</span>{/if}
						</span>
					</div>
					{#if can.manage}
						<div class="flex flex-wrap gap-2">
							{#if active && can.live && m.status === 'ACTIVE' && !m.coordinate && !m.proposed}
								<form method="POST" action="?/proposer" use:enhance>
									<input type="hidden" name="participantId" value={m.id} />
									<button class="lm-btn" data-variant="ghost"
										>Proposer la coordination<span class="sr-only"> à {m.name}</span></button
									>
								</form>
							{/if}
							{#if m.coordinate || m.proposed}
								<form method="POST" action="?/revoquer" use:enhance>
									<input type="hidden" name="participantId" value={m.id} />
									<button class="lm-btn" data-variant="ghost"
										>Retirer la coordination<span class="sr-only"> de {m.name}</span></button
									>
								</form>
							{/if}
							<button
								type="button"
								class="lm-btn"
								data-variant="ghost"
								onclick={() =>
									(leaving = {
										id: m.id,
										name: m.name,
										self: false,
										invited: m.status === 'INVITED',
										coordinate: m.coordinate
									})}
								>{m.status === 'INVITED' ? 'Annuler l’invitation' : 'Retirer du projet'}<span
									class="sr-only"
								>
									: {m.name}</span
								></button
							>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
		{#if organise && p.team.length === 0}
			<MetroEmpty
				icon={UsersRound}
				text="Tu travailles seul·e sur ce projet pour l’instant. Une personne invitée voit le nom, le type et le porteur du projet avant de répondre."
			/>
		{/if}
		{#if organise}
			<div class="flex flex-wrap gap-3">
				<button
					id="inviter"
					type="button"
					class="lm-btn"
					onclick={() => (inviteOpen = true)}
					data-testid="invite-open">Inviter quelqu’un</button
				>
				{#if members.length > 0}
					<button
						type="button"
						class="lm-btn"
						data-variant="ghost"
						onclick={() => (membersOpen = true)}
						>Inviter les membres du groupe <span class="text-muted-foreground"
							>· {members.length}</span
						></button
					>
				{/if}
			</div>
		{:else if p.me && !can.manage}
			<p class="text-sm text-muted-foreground">
				{askToInvite(
					p.team.filter((m) => m.coordinate && !m.isMe).map((m) => m.name),
					p.owner.name
				)}
			</p>
		{/if}
		{#if p.me && !can.manage}
			<button
				type="button"
				class="lm-btn"
				data-variant="ghost"
				onclick={() =>
					(leaving = {
						id: p.me!.id,
						name: 'Toi',
						self: true,
						invited: false,
						coordinate: can.coordinate
					})}>Quitter le projet</button
			>
		{/if}
	</section>
{/snippet}

{#snippet needsBlock()}
	{#if p.needs.length > 0 || canAddNeed}
		<section id="besoins" aria-labelledby="besoins-titre" class="space-y-4">
			<div class="flex flex-wrap items-baseline justify-between gap-3">
				<h2 id="besoins-titre" class="lm-kicker text-muted-foreground">
					Besoins <span class="text-muted-foreground"
						>· {openNeeds} ouvert{openNeeds > 1 ? 's' : ''}</span
					>
				</h2>
				{#if canAddNeed}
					<button type="button" class="lm-btn" onclick={() => openNeedSheet(null)}>
						<Plus class="size-4" aria-hidden="true" />
						{can.manage ? 'Ajouter un besoin' : 'Proposer un besoin'}
					</button>
				{/if}
			</div>
			{#if p.needs.length === 0}
				<MetroEmpty
					icon={Target}
					text={can.manage
						? 'Il te manque quelqu’un ? Dis-le ici : tu pourras ensuite chercher, inviter ou publier une annonce.'
						: 'Il manque quelqu’un au projet ? Propose-le : la gestion décidera de l’ouvrir.'}
				/>
			{:else}
				{#if pendingNeeds.length > 0 && can.manage}
					<p class="text-sm font-medium" data-testid="needs-pending">
						{pendingNeeds.length === 1
							? 'Une proposition attend ta décision.'
							: `${pendingNeeds.length} propositions attendent ta décision.`}
					</p>
				{/if}
				<ul class="space-y-3" aria-label="Besoins du projet">
					{#each shownNeeds as need (need.id)}
						{@render needTile(need)}
					{/each}
				</ul>
				{#if p.needs.length > NEEDS_SHOWN && !allNeeds}
					<button
						type="button"
						class="lm-btn"
						data-variant="ghost"
						onclick={() => (allNeeds = true)}
					>
						Voir les {p.needs.length} besoins
					</button>
				{/if}
			{/if}
		</section>
	{/if}
{/snippet}

{#snippet needTile(need: (typeof p.needs)[number])}
	<li
		data-tone="paper"
		class="lm-tile lm-tile--flow space-y-3 p-4"
		data-testid="need"
		data-status={need.status}
	>
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<p class="min-w-0 font-medium wrap-break-word">{need.label}</p>
			<span class="lm-pill inline-flex items-center gap-1 text-xs">
				{#if need.status === 'FILLED'}<Check
						class="size-3"
						aria-hidden="true"
					/>{:else if need.status === 'PROPOSED'}<Clock
						class="size-3"
						aria-hidden="true"
					/>{:else if need.status === 'DECLINED'}<X
						class="size-3"
						aria-hidden="true"
					/>{:else}<Target class="size-3" aria-hidden="true" />{/if}
				{need.statusLabel}
			</span>
		</div>
		{#if need.description}<p class="text-sm wrap-break-word">« {need.description} »</p>{/if}
		<p class="text-sm text-muted-foreground">
			{need.status === 'PROPOSED' ? 'Proposé par' : 'Formulé par'}
			{need.author}{#if need.filledBy}
				· pourvu par {need.filledBy}{/if}
		</p>
		{#if need.opportunity}
			<p class="text-sm">
				<a href={resolve('/(app)/annonces/[id]', { id: need.opportunity.id })} class="underline"
					>{need.opportunity.open ? 'Annonce ouverte' : 'Annonce close'}</a
				>{#if need.opportunity.applications !== null}
					· {plural(need.opportunity.applications, 'candidature', 'candidatures')}{/if}
			</p>
		{/if}
		{#if need.opportunityRefusal}
			<p class="text-sm text-muted-foreground">{need.opportunityRefusal}</p>
		{/if}
		{#if need.searchQuery || need.actions.length > 0 || need.opportunityQuery}
			<div class="flex flex-wrap items-end gap-3">
				{#if need.actions.includes('open')}
					<form method="POST" action="?/besoin-decider" use:enhance>
						<input type="hidden" name="needId" value={need.id} />
						<input type="hidden" name="decision" value="open" />
						<button class="lm-btn"
							>Ouvrir ce besoin<span class="sr-only"> : {need.label}</span></button
						>
					</form>
				{/if}
				{#if need.actions.includes('decline')}
					<form method="POST" action="?/besoin-decider" use:enhance>
						<input type="hidden" name="needId" value={need.id} />
						<input type="hidden" name="decision" value="decline" />
						<button class="lm-btn" data-variant="ghost"
							>Ne pas retenir<span class="sr-only"> : {need.label}</span></button
						>
					</form>
				{/if}
				{#if need.searchQuery}
					<a
						href={`${resolve('/(app)/decouvrir')}?${need.searchQuery}`}
						class="lm-btn"
						data-variant="ghost"
						data-testid="need-search"
						><Search class="size-4" aria-hidden="true" /> Trouver un pro<span class="sr-only">
							: {need.label}</span
						></a
					>
				{/if}
				{#if need.status === 'OPEN' && organise}
					<button
						type="button"
						class="lm-btn"
						data-variant="ghost"
						onclick={() => inviteFor(need.label)}
						><UserPlus class="size-4" aria-hidden="true" /> Inviter<span class="sr-only">
							pour : {need.label}</span
						></button
					>
				{/if}
				{#if need.opportunityQuery}
					<a
						href={`${resolve('/(app)/annonces/nouvelle')}?${need.opportunityQuery}`}
						class="lm-btn"
						data-variant="ghost"
						data-testid="need-opportunity"
						><Megaphone class="size-4" aria-hidden="true" /> Préparer l’annonce<span
							class="sr-only"
						>
							: {need.label}</span
						></a
					>
				{/if}
				{#if need.actions.includes('update')}
					<button
						type="button"
						class="lm-btn"
						data-variant="ghost"
						onclick={() => openNeedSheet(need)}
						><Pencil class="size-4" aria-hidden="true" /> Modifier<span class="sr-only">
							: {need.label}</span
						></button
					>
				{/if}
				{#if need.actions.includes('withdraw')}
					<form method="POST" action="?/besoin-retirer" use:enhance>
						<input type="hidden" name="needId" value={need.id} />
						<button class="lm-btn" data-variant="ghost"
							>Retirer ma proposition<span class="sr-only"> : {need.label}</span></button
						>
					</form>
				{/if}
				{#if need.actions.includes('fill')}
					<form
						method="POST"
						action="?/besoin-pourvu"
						use:enhance
						class="flex flex-wrap items-end gap-2"
					>
						<input type="hidden" name="needId" value={need.id} />
						{#if activeTeam.length > 0}
							<label class="text-sm">
								<span class="block">Par qui ? (facultatif)</span>
								<select name="participantId" class="lm-field">
									<option value="">Personne en particulier</option>
									{#each activeTeam as m (m.id)}
										<option value={m.id}>{m.isMe ? 'Toi' : m.name}</option>
									{/each}
								</select>
							</label>
						{/if}
						<button class="lm-btn" data-variant="ghost"
							>Marquer pourvu<span class="sr-only"> : {need.label}</span></button
						>
					</form>
				{/if}
				{#if need.actions.includes('reopen')}
					<form method="POST" action="?/besoin-rouvrir" use:enhance>
						<input type="hidden" name="needId" value={need.id} />
						<button class="lm-btn" data-variant="ghost"
							>Rouvrir<span class="sr-only"> : {need.label}</span></button
						>
					</form>
				{/if}
				{#if need.actions.includes('cancel')}
					<form method="POST" action="?/besoin-annuler" use:enhance>
						<input type="hidden" name="needId" value={need.id} />
						<button class="lm-btn" data-variant="danger"
							>Annuler ce besoin<span class="sr-only"> : {need.label}</span></button
						>
					</form>
				{/if}
			</div>
		{/if}
	</li>
{/snippet}

{#snippet itemsBlock()}
	<section aria-labelledby="morceaux" class="space-y-4">
		<h2 id="morceaux" class="lm-kicker text-muted-foreground">
			{itemsTitle} <span class="text-muted-foreground">· {p.counts.items}</span>
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
													<span class="block text-sm text-muted-foreground">{SHARE_PHRASES[s]}</span
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
						{#if item.manage || (active && (can.manage || (can.coordinate && item.addedByMe)))}
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

		{#if organise}
			{#if data.rangeable.length > 0}
				<form
					id="ranger"
					method="POST"
					action="?/ranger"
					use:enhance
					data-tone="paper"
					class="lm-tile lm-tile--flow space-y-4 p-4"
					aria-labelledby="ranger-titre"
				>
					<h3 id="ranger-titre" class="font-medium">Ranger un de mes morceaux</h3>
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
									<option value={w.id}>{w.title} · {w.state}{w.owner ? ` · ${w.owner}` : ''}</option
									>
								{/each}
							</select>
						{/snippet}
					</MetroField>
					<fieldset class="space-y-2">
						<legend class="text-sm font-medium">Ce que voient les autres personnes du projet</legend
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
{/snippet}

{#snippet datesBlock()}
	<section aria-labelledby="dates" class="space-y-3">
		<h2 id="dates" class="lm-kicker text-muted-foreground">Dates</h2>
		<div data-tone={TONE_OF.agenda} class="lm-tile lm-tile--flow space-y-2 p-4">
			{#if dates.length > 0}
				<ul class="space-y-1">
					{#each dates as line (line)}
						<li class="flex items-center gap-2">
							<CalendarDays class="size-4 shrink-0" aria-hidden="true" />{line}
						</li>
					{/each}
				</ul>
			{:else}
				<p>Aucune date posée.</p>
			{/if}
			<p class="text-sm">
				Les concerts et les dates de tournée ne se rangent pas encore dans un projet.
			</p>
		</div>
	</section>
{/snippet}

{#snippet journalBlock()}
	<section aria-labelledby="journal" class="space-y-3">
		<h2 id="journal" class="lm-kicker text-muted-foreground">Journal</h2>
		{#if p.journal.length === 0}
			<p class="text-sm text-muted-foreground">Rien pour l’instant.</p>
		{/if}
		<ul class="space-y-2 text-sm">
			{#each p.journal as j (j.id)}
				<li>
					{line(j)}
					<span class="text-muted-foreground"> · {j.author} · {when(j.occurredAt)}</span>
				</li>
			{/each}
		</ul>
	</section>
{/snippet}

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

<!-- U3 (§8.2) : inviter une personne connue ; l'@identifiant reste possible. -->
<MetroSheet
	bind:open={needSheetOpen}
	title={editing ? `Modifier : ${editing.label}` : `Ce qui manque à ${p.name}`}
>
	<form
		method="POST"
		action={editing ? '?/besoin-modifier' : '?/besoin-ajouter'}
		class="space-y-5"
		data-testid="need-sheet"
		use:enhance={() => {
			needSending = true;
			return async ({ result, update }) => {
				await update({ reset: false });
				needSending = false;
				if (result.type === 'success') needSheetOpen = false;
			};
		}}
	>
		{#if editing}<input type="hidden" name="needId" value={editing.id} />{/if}
		{#if (form?.action === 'besoin-ajouter' || form?.action === 'besoin-modifier') && form.error}
			<p role="alert" class="lm-alert p-3 text-sm">{form.error}</p>
		{/if}
		<MetroField id="needTrack" label="Métier recherché">
			{#snippet children(attrs)}
				<select
					{...attrs}
					name="track"
					bind:value={needTrack}
					onchange={() => {
						needSpecialty = '';
						needInstrument = '';
					}}
				>
					{#each NEED_TRACKS as t (t)}
						<option value={t}>{NEED_TRACK_LABELS[t]}</option>
					{/each}
				</select>
			{/snippet}
		</MetroField>
		{#if needSpecialties.length > 0}
			<MetroField id="needSpecialty" label="Précision" optional>
				{#snippet children(attrs)}
					<select {...attrs} name="specialty" bind:value={needSpecialty}>
						<option value="">Sans précision</option>
						{#each needSpecialties as sp (sp.id)}
							<option value={sp.id}>{sp.label}</option>
						{/each}
					</select>
				{/snippet}
			</MetroField>
		{:else if needTrack === 'MUSICIAN' && data.instruments.length > 0}
			<MetroField id="needInstrument" label="Instrument" optional>
				{#snippet children(attrs)}
					<select {...attrs} name="instrument" bind:value={needInstrument}>
						<option value="">Sans précision</option>
						{#each data.instruments as i (i.slug)}
							<option value={i.slug}>{i.name}</option>
						{/each}
					</select>
				{/snippet}
			</MetroField>
		{/if}
		<MetroField
			id="needDescription"
			label="En une phrase"
			optional
			help={`Visible des personnes du projet seulement. ${MAX_NEED_DESCRIPTION} caractères au plus.`}
		>
			{#snippet children(attrs)}
				<textarea
					{...attrs}
					name="description"
					rows="3"
					maxlength={MAX_NEED_DESCRIPTION}
					bind:value={needDescription}
				></textarea>
			{/snippet}
		</MetroField>
		{#if !can.manage && !editing}
			<p class="text-sm text-muted-foreground">
				La gestion de {p.owner.isMe ? 'ce projet' : p.owner.name} décidera de l’ouvrir. Rien n’est envoyé
				à personne.
			</p>
		{/if}
		<div class="flex flex-wrap gap-3">
			<button class="lm-btn" disabled={needSending} aria-busy={needSending}>
				{needSending
					? 'Envoi…'
					: editing
						? 'Enregistrer'
						: addLabel(can.manage ? 'manage' : 'coordinate')}
			</button>
			<button
				type="button"
				class="lm-btn"
				data-variant="ghost"
				onclick={() => (needSheetOpen = false)}>Annuler</button
			>
		</div>
	</form>
</MetroSheet>

<MetroSheet bind:open={inviteOpen} title={`Inviter dans ${p.name}`}>
	<form
		method="POST"
		action="?/inviter"
		class="space-y-5"
		data-testid="invite-sheet"
		use:enhance={() => {
			sending = 'inviter';
			return async ({ result, update }) => {
				await update({ reset: false });
				sending = null;
				if (result.type === 'success') {
					inviteOpen = false;
					resetInvite();
				}
			};
		}}
	>
		{#if form?.action === 'inviter' && form.error}
			<p role="alert" class="lm-alert p-3 text-sm">{form.error}</p>
		{/if}
		<fieldset class="space-y-2">
			<legend class="text-sm font-medium">Qui ?</legend>
			{#if data.invite.candidates.length > 0}
				<MetroField id="invite-search" label="Rechercher dans tes contacts" optional>
					{#snippet children(attrs)}
						<input
							{...attrs}
							type="search"
							bind:value={query}
							autocomplete="off"
							placeholder="Un nom ou un @identifiant"
						/>
					{/snippet}
				</MetroField>
				<ul class="max-h-64 space-y-1 overflow-y-auto" aria-label="Personnes que tu connais">
					{#each shown as c (c.id)}
						<li>
							<label class="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-1">
								<input
									type="radio"
									name="personId"
									value={c.id}
									checked={pick === c.id}
									onchange={() => choosePerson(c.id)}
								/>
								<span class="min-w-0">
									<span class="block font-medium wrap-break-word">{c.name}</span>
									<span class="block text-xs text-muted-foreground"
										>@{c.handle} · {c.member ? `Membre de ${p.owner.name}` : 'Contact'}</span
									>
								</span>
							</label>
						</li>
					{:else}
						<li class="text-sm text-muted-foreground">Personne de ce nom parmi tes contacts.</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-muted-foreground">
					Aucun contact à proposer ici : tes contacts sont déjà dans le projet, ou tu n’en as pas
					encore. <a href="/messages/contacts" class="underline">Mon carnet</a>
				</p>
			{/if}
			<details bind:open={byHandle}>
				<summary class="min-h-11 cursor-pointer py-2 text-sm"
					>Pas dans la liste ? Son identifiant</summary
				>
				<MetroField
					id="invite-handle"
					label="Identifiant"
					help="Son @identifiant, visible sur son profil. Une ou un mineur·e ne s’invite que depuis son groupe."
				>
					{#snippet children(attrs)}
						<input
							{...attrs}
							name="handle"
							maxlength="65"
							autocomplete="off"
							bind:value={handle}
							oninput={() => (pick = '')}
						/>
					{/snippet}
				</MetroField>
			</details>
		</fieldset>
		<MetroField
			id="invite-role"
			label="Son rôle dans le projet"
			help="Un libellé, par exemple « ingé son de la tournée ». Il ne donne aucun droit."
			optional
		>
			{#snippet children(attrs)}
				<input {...attrs} name="role" maxlength="60" bind:value={inviteRole} />
			{/snippet}
		</MetroField>
		{#if data.invite.canPropose}
			<fieldset class="space-y-1">
				<legend class="text-sm font-medium">Ce qu’elle ou il pourra faire</legend>
				<label class="flex min-h-11 items-start gap-2 py-1">
					<input type="radio" name="preset" value="participant" bind:group={preset} class="mt-1" />
					<span
						><span class="font-medium">Participer</span>
						<span class="block text-sm text-muted-foreground">{PRESETS.participant.phrase}</span
						></span
					>
				</label>
				{#if !chosenPerson || chosenPerson.canCoordinate}
					<label class="flex min-h-11 items-start gap-2 py-1">
						<input
							type="radio"
							name="preset"
							value="coordinator"
							bind:group={preset}
							class="mt-1"
						/>
						<span
							><span class="font-medium">Coordonner</span>
							<span class="block text-sm text-muted-foreground">{PRESETS.coordinator.phrase}</span
							></span
						>
					</label>
				{:else}
					<p class="text-sm text-muted-foreground">{COORDINATE_ADULTS_ONLY}</p>
				{/if}
				{#if preset === 'coordinator' && (!chosenPerson || chosenPerson.canCoordinate)}
					<input type="hidden" name="coordinate" value="on" />
				{/if}
			</fieldset>
		{:else}
			<p class="text-sm">
				<span class="font-medium">{PRESETS.participant.label}</span> :
				<span class="text-muted-foreground">{PRESETS.participant.phrase}</span>
			</p>
		{/if}
		<p class="text-sm text-muted-foreground">{INVITE_PREVIEW}</p>
		<div class="flex flex-wrap justify-end gap-3">
			<button type="button" class="lm-btn" data-variant="ghost" onclick={() => (inviteOpen = false)}
				>Annuler</button
			>
			<button
				class="lm-btn"
				disabled={sending === 'inviter' || (!pick && !handle.trim())}
				aria-busy={sending === 'inviter'}>{sending === 'inviter' ? 'Envoi…' : 'Inviter'}</button
			>
		</div>
	</form>
</MetroSheet>

<!-- UX-8 : une invitation par membre, chacune acceptée ; personne n'est ajouté d'office. -->
<MetroSheet bind:open={membersOpen} title="Inviter les membres du groupe ?">
	<form
		method="POST"
		action="?/inviter-membres"
		class="space-y-4"
		use:enhance={() => {
			sending = 'membres';
			return async ({ update }) => {
				await update();
				sending = null;
				membersOpen = false;
			};
		}}
	>
		<p>
			{plural(members.length, 'membre recevra', 'membres recevront')} chacun·e une invitation dans « {p.name}
			» :
			{members.map((m) => m.name).join(', ')}.
		</p>
		<p class="text-sm text-muted-foreground">
			Personne n’est ajouté sans accepter. {PRESETS.participant.phrase} Tu pourras proposer la coordination
			ensuite.
		</p>
		<div class="flex flex-wrap justify-end gap-3">
			<button
				type="button"
				class="lm-btn"
				data-variant="ghost"
				onclick={() => (membersOpen = false)}>Annuler</button
			>
			<button class="lm-btn" disabled={sending === 'membres'} aria-busy={sending === 'membres'}
				>{sending === 'membres' ? 'Envoi…' : 'Envoyer les invitations'}</button
			>
		</div>
	</form>
</MetroSheet>

<!-- §8.2 : retirer (gestion) ou quitter (soi), effets énoncés avant le geste. -->
<MetroSheet
	bind:open={() => leaving !== null, (v) => (leaving = v ? leaving : null)}
	title={leaving?.self
		? 'Quitter ce projet ?'
		: leaving?.invited
			? 'Annuler cette invitation ?'
			: `Retirer ${leaving?.name ?? ''} du projet ?`}
>
	{#if leaving}
		<form
			method="POST"
			action={leaving.self ? '?/quitter' : '?/retirer-personne'}
			class="space-y-4"
			use:enhance={() => {
				sending = 'retrait';
				return async ({ update }) => {
					await update();
					sending = null;
					leaving = null;
				};
			}}
		>
			{#if !leaving.self}<input type="hidden" name="participantId" value={leaving.id} />{/if}
			<p data-testid="leave-effects">{removalEffects(leaving)}</p>
			<div class="flex flex-wrap justify-end gap-3">
				<button type="button" class="lm-btn" data-variant="ghost" onclick={() => (leaving = null)}
					>Annuler</button
				>
				<button
					class="lm-btn"
					data-variant="danger"
					disabled={sending === 'retrait'}
					aria-busy={sending === 'retrait'}
					>{sending === 'retrait'
						? 'Envoi…'
						: leaving.self
							? 'Quitter le projet'
							: leaving.invited
								? 'Annuler l’invitation'
								: 'Retirer du projet'}</button
				>
			</div>
		</form>
	{/if}
</MetroSheet>
