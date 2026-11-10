<script lang="ts">
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
	import { BadgeCheck } from 'lucide-svelte';
	// LINKMUSICIAN: un groupe (P3-01), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import DemarcheCard from '#lib/components/linkmusician/demarches/DemarcheCard.svelte';
	import { MAX_MEMBER_TITLE, ROLE_LABELS, isManager, periodLabel } from '#lib/bands/rules';
	import { plural } from '#lib/jam/log';
	import {
		MAX_MILESTONE_NOTE,
		MILESTONE_CATALOG,
		MIN_MILESTONE_DATE,
		PROOF_LABELS,
		todayInParis,
		type MilestoneKey
	} from '#lib/milestones/rules';
	import { EVIDENCE_LABELS, proofRule } from '#lib/milestones/proofs';
	import { FROZEN_LABEL } from '#lib/milestones/disputes';
	import {
		Circle,
		CircleCheck,
		FileDown,
		Flag,
		Music,
		PartyPopper,
		UserPlus,
		UsersRound
	} from 'lucide-svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.message) toast.success(form.message);
	});

	const band = $derived(data.band);
	const myRole = $derived(band.my?.role ?? null);
	const manager = $derived(isManager(myRole));
	const owner = $derived(myRole === 'OWNER');
	const member = $derived(band.my?.status === 'ACTIVE');
	const dissolved = $derived(band.dissolvedAt !== null);
	const period = (m: { startedAt: Date | string | null; endedAt: Date | string | null }) =>
		periodLabel(m.startedAt ? new Date(m.startedAt) : null, m.endedAt ? new Date(m.endedAt) : null);
	const day = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Europe/Paris'
	});

	// Étapes (P3-04) : 1 à 6 ouvertes, les suivantes annoncées.
	const openSteps = MILESTONE_CATALOG.filter((d) => d.mode !== 'later');
	const releaseSteps = MILESTONE_CATALOG.filter(
		(d) => d.key === 'FIRST_EP' || d.key === 'FIRST_ALBUM'
	);
	const laterSteps = MILESTONE_CATALOG.filter((d) => d.mode === 'later').map((d) => d.label);
	const stepOf = (key: MilestoneKey) => data.milestones.find((m) => m.key === key) ?? null;
	const today = todayInParis();
	const isoDay = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
	const NOTE_EXAMPLES: Partial<Record<MilestoneKey, string>> = {
		FIRST_REHEARSAL: 'Au local de répétition',
		FIRST_RECORDING: 'Démo maison, trois titres',
		FIRST_PUBLIC_DEMO: 'Sur Bandcamp',
		FIRST_GIG: 'Au bar du coin, en première partie'
	};
	/** Étape dont le formulaire est ouvert (déclarer ou corriger). */
	let stepForm = $state<MilestoneKey | null>(null);
	const closeOnSuccess =
		() =>
		async ({ result, update }: { result: { type: string }; update: () => Promise<void> }) => {
			if (result.type === 'success') stepForm = null;
			await update();
		};

	// Preuves (P3-05) : étape dont le panneau « Prouver » est ouvert.
	let proofOpen = $state<string | null>(null);
	const ATTESTATION_STATUS = {
		REQUESTED: 'en attente',
		CONFIRMED: 'a confirmé',
		DECLINED: 'n’y était pas'
	} as const;
	const EVIDENCE_STATUS = {
		PENDING: 'en cours de vérification',
		ACCEPTED: 'ajouté',
		REJECTED: 'refusé',
		VERIFIED: 'vérifié par MusicBrainz'
	} as const;

	let handle = $state('');
	let confirmLeave = $state(false);
	/** Membre dont le menu de gestion est ouvert. */
	let managing = $state<string | null>(null);
</script>

<SEO title={band.name} noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-7xl space-y-8">
		<div class="space-y-2">
			<a href="/groupes" class="text-sm text-muted-foreground underline">← Mes groupes</a>
			<h1 class="flex items-center gap-2 text-3xl font-black tracking-tight sm:text-4xl">
				<UsersRound class="size-7" aria-hidden="true" />
				{band.name}
			</h1>
			{#if data.tier}<TierBadge {...data.tier} prefix="Rang du groupe :" />{/if}
			<p class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
				<a href="/@{band.handle}" class="underline">Voir la page publique</a>
				{#if manager && !dissolved}
					<a href="/groupes/{band.handle}/modifier" class="font-semibold underline"
						>Modifier la fiche du groupe</a
					>
					<a href="/annonces/nouvelle?groupe={band.handle}" class="font-semibold underline"
						>Publier une annonce de recrutement</a
					>
				{/if}
			</p>
			<p class="text-sm text-muted-foreground">
				{#if dissolved}
					Groupe dissous le {day.format(new Date(band.dissolvedAt!))}.
				{:else if band.formedAt}
					Formé le {day.format(new Date(band.formedAt))} · {plural(band.members.length, 'membre')}
				{:else}
					En formation : le groupe est formé dès qu’un premier membre le rejoint.
				{/if}
			</p>
		</div>

		<DemarcheCard nudge={data.demarche} />

		{#if data.created && !band.formedAt}
			<div class="flex gap-3 rounded-2xl border border-primary bg-card p-4 text-sm">
				<PartyPopper class="size-5 shrink-0 text-primary" aria-hidden="true" />
				<p>
					Ton groupe existe. Invite quelqu’un avec qui tu as joué : à son arrivée, le groupe est
					formé et vous gagnez des points tous les deux.
				</p>
			</div>
		{/if}

		{#if form?.error}
			<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
				{form.error}
			</p>
		{/if}

		{#if !dissolved && !band.my}
			<form method="POST" action="?/request" use:enhance>
				<button
					class="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
				>
					<UserPlus class="size-4" aria-hidden="true" /> Demander à rejoindre
				</button>
			</form>
		{:else if band.my?.status === 'REQUESTED'}
			<p class="rounded-2xl border bg-card p-4 text-sm">
				Ta demande est envoyée. Le groupe te répondra ici.
			</p>
		{:else if band.my?.status === 'INVITED'}
			<p class="rounded-2xl border border-primary bg-card p-4 text-sm">
				Le groupe t’invite.
				<a href="/groupes" class="font-semibold underline">Répondre à l’invitation</a>
			</p>
		{/if}

		{#if manager && band.requests.length > 0}
			<section class="space-y-3" aria-labelledby="requests-title">
				<h2 id="requests-title" class="text-xl font-bold">Demandes pour rejoindre</h2>
				<ul class="grid gap-2 md:grid-cols-2">
					{#each band.requests as r (r.membershipId)}
						<li
							class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-4"
						>
							{#if r.handle}
								<a href="/@{r.handle}" class="font-semibold underline">{r.name}</a>
							{:else}
								<span class="font-semibold">{r.name}</span>
							{/if}
							<div class="flex gap-2">
								<form method="POST" action="?/acceptRequest" use:enhance>
									<input type="hidden" name="membershipId" value={r.membershipId} />
									<button
										class="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
										>Accepter {r.name}</button
									>
								</form>
								<form method="POST" action="?/declineRequest" use:enhance>
									<input type="hidden" name="membershipId" value={r.membershipId} />
									<button class="min-h-11 rounded-full border px-4">Refuser</button>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="space-y-3" aria-labelledby="members-title">
			<h2 id="members-title" class="text-xl font-bold">Membres</h2>
			<ul class="grid gap-3 md:grid-cols-2" aria-label="Membres actuels">
				{#each band.members as m (m.membershipId)}
					<li class="space-y-2 rounded-2xl border bg-card p-4">
						<div class="flex flex-wrap items-start justify-between gap-2">
							<span>
								{#if m.handle}
									<a href="/@{m.handle}" class="font-semibold underline">{m.name}</a>
								{:else}
									<span class="font-semibold">{m.name}</span>
								{/if}
								{#if m.isMe}<span class="text-sm text-muted-foreground"> (toi)</span>{/if}
								<span class="block text-sm text-muted-foreground"
									>{m.role === 'MEMBER' ? '' : `${ROLE_LABELS[m.role]} · `}{m.title
										? `${m.title} · `
										: ''}{period(m)}</span
								>
							</span>
							{#if manager && !m.isMe && m.role !== 'OWNER' && (owner || m.role === 'MEMBER')}
								<button
									type="button"
									class="min-h-11 px-2 text-sm underline"
									aria-expanded={managing === m.membershipId}
									onclick={() => (managing = managing === m.membershipId ? null : m.membershipId)}
									>Gérer</button
								>
							{/if}
						</div>
						{#if managing === m.membershipId}
							<div class="flex flex-wrap gap-2 border-t pt-2">
								{#if owner}
									<form
										method="POST"
										action={m.role === 'ADMIN' ? '?/demote' : '?/promote'}
										use:enhance
									>
										<input type="hidden" name="membershipId" value={m.membershipId} />
										<button class="min-h-11 rounded-full border px-3 text-sm"
											>{m.role === 'ADMIN'
												? 'Retirer la co-gestion'
												: 'Confier la co-gestion'}</button
										>
									</form>
									<form method="POST" action="?/transfer" use:enhance>
										<input type="hidden" name="membershipId" value={m.membershipId} />
										<button class="min-h-11 rounded-full border px-3 text-sm"
											>Lui transmettre le groupe</button
										>
									</form>
								{/if}
								<form method="POST" action="?/remove" use:enhance>
									<input type="hidden" name="membershipId" value={m.membershipId} />
									<button
										class="min-h-11 rounded-full border border-destructive px-3 text-sm text-destructive"
										>Retirer du groupe</button
									>
								</form>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</section>

		{#if member}
			<section class="space-y-3" aria-labelledby="milestones-title">
				<h2 id="milestones-title" class="flex items-center gap-2 text-xl font-bold">
					<Flag class="size-5" aria-hidden="true" /> Parcours du groupe
				</h2>
				{#if !band.formedAt}
					<p class="text-sm text-muted-foreground">
						Le parcours s’ouvre quand le groupe est formé : invitez un premier membre.
					</p>
				{:else}
					<ol class="grid gap-3 xl:grid-cols-2" aria-label="Étapes du groupe">
						{#each openSteps as def (def.key)}
							{@const step = stepOf(def.key)}
							{@const rule = proofRule(def.key)}
							{@const proofs = step ? data.proofs[step.id] : undefined}
							<li class="space-y-3 rounded-2xl border bg-card p-4">
								<div class="flex items-start justify-between gap-2">
									<span class="flex gap-3">
										{#if step}
											<CircleCheck class="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
										{:else}
											<Circle
												class="mt-0.5 size-5 shrink-0 text-muted-foreground"
												aria-hidden="true"
											/>
										{/if}
										<span>
											<span class="font-semibold">{def.label}</span>
											{#if step}
												<span class="ml-1 rounded-full border px-2 py-0.5 text-xs"
													>{step.frozen ? FROZEN_LABEL : PROOF_LABELS[step.proof]}</span
												>
												<span class="block text-sm text-muted-foreground"
													>{day.format(new Date(step.occurredAt))}{step.note
														? ` · ${step.note}`
														: ''}</span
												>
												{#if step.releaseUrl}
													<a
														href={step.releaseUrl}
														target="_blank"
														rel="noopener noreferrer"
														class="text-sm underline">Voir la sortie vérifiée</a
													>
												{/if}
											{:else}
												<span class="block text-sm text-muted-foreground">{def.hint}</span>
											{/if}
										</span>
									</span>
									{#if manager && !dissolved && def.mode === 'declare' && stepForm !== def.key && !step?.frozen}
										<button
											type="button"
											class="min-h-11 shrink-0 rounded-full border px-3 text-sm {step
												? ''
												: 'font-semibold'}"
											onclick={() => (stepForm = def.key)}
											>{step ? 'Modifier' : 'C’est fait'}<span class="sr-only">
												: {def.label}</span
											></button
										>
									{/if}
								</div>
								{#if stepForm === def.key}
									<form
										method="POST"
										action={step ? '?/editMilestone' : '?/declare'}
										class="space-y-3 border-t pt-3"
										use:enhance={closeOnSuccess}
									>
										{#if step}
											<input type="hidden" name="milestoneId" value={step.id} />
										{:else}
											<input type="hidden" name="key" value={def.key} />
										{/if}
										<div class="flex flex-wrap gap-3">
											<label class="block space-y-1 text-sm font-medium">
												Date
												<input
													type="date"
													name="day"
													required
													min={MIN_MILESTONE_DATE}
													max={today}
													value={step ? isoDay(step.occurredAt) : today}
													class="block rounded-md border bg-background p-2 font-normal"
												/>
											</label>
											<label class="block grow space-y-1 text-sm font-medium">
												Précision <span class="font-normal text-muted-foreground">(facultatif)</span
												>
												<input
													name="note"
													autocomplete="off"
													maxlength={MAX_MILESTONE_NOTE}
													value={step?.note ?? ''}
													placeholder={NOTE_EXAMPLES[def.key] ?? ''}
													class="w-full rounded-md border bg-background p-2 font-normal"
												/>
											</label>
										</div>
										{#if !step}
											<p class="text-sm text-muted-foreground">
												+{data.declaredXp[def.key]} points pour le groupe, et une part pour chaque membre.
												Avec une preuve (bientôt), l’étape rapportera davantage.
											</p>
										{/if}
										<div class="flex gap-2">
											<button
												class="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
												>{step ? 'Enregistrer' : 'Ajouter au parcours'}</button
											>
											<button
												type="button"
												class="min-h-11 rounded-full border px-4"
												onclick={() => (stepForm = null)}>Annuler</button
											>
										</div>
									</form>
									{#if step}
										<!-- Retirer une étape déclarée par erreur (P3-06) : ses points sont repris. -->
										<form
											method="POST"
											action="?/retractMilestone"
											use:enhance={closeOnSuccess}
											class="border-t pt-3 text-sm"
										>
											<input type="hidden" name="milestoneId" value={step.id} />
											<p class="text-muted-foreground">
												Déclarée par erreur ? La retirer reprend les points qu’elle a rapportés au
												groupe et à ses membres.
											</p>
											<button class="mt-2 min-h-11 text-destructive underline"
												>Retirer l’étape « {def.label} »</button
											>
										</form>
									{/if}
								{/if}
								{#if step?.frozen}
									<p class="border-t pt-3 text-sm" role="status">
										Quelqu’un a signalé cette étape : la modération vérifie. En attendant, elle
										n’apparaît plus comme prouvée et ne reçoit plus de preuve.
									</p>
								{/if}
								{#if step && !step.frozen && rule && proofs && (step.proof === 'DECLARED' || proofs.attestations.length > 0 || proofs.evidence.length > 0)}
									<div class="space-y-2 border-t pt-3 text-sm">
										{#if step.proof === 'DECLARED'}
											<p class="font-semibold">Pour la corroborer :</p>
											<ul class="space-y-1" aria-label="Preuves : {def.label}">
												{#each proofs.checklist as item (item.label)}
													<li class="flex gap-2">
														<span aria-hidden="true"
															>{item.done ? '✅' : item.pending ? '⏳' : '⬜'}</span
														>
														<span
															>{item.label}{item.pending && !item.done ? ' (en attente)' : ''}</span
														>
													</li>
												{/each}
											</ul>
										{/if}
										{#if proofs.attestations.length > 0 || proofs.evidence.length > 0}
											<ul
												class="space-y-1 text-muted-foreground"
												aria-label="Demandes et liens : {def.label}"
											>
												{#each proofs.attestations as a, i (i)}
													<li>{a.name} · {ATTESTATION_STATUS[a.status]}</li>
												{/each}
												{#each proofs.evidence as e (e.id)}
													<li class="break-all">
														<a
															href={e.url}
															class="underline"
															target="_blank"
															rel="noopener noreferrer">{EVIDENCE_LABELS[e.kind]}</a
														>
														· {EVIDENCE_STATUS[e.status]}{e.status === 'REJECTED' &&
														e.rejectionReason
															? ` : ${e.rejectionReason}`
															: ''}
													</li>
												{/each}
											</ul>
										{/if}
										{#if manager && !dissolved && step.proof === 'DECLARED'}
											{#if proofOpen !== step.id}
												<button
													type="button"
													class="min-h-11 rounded-full border px-3 font-semibold"
													onclick={() => (proofOpen = step.id)}
													>Prouver<span class="sr-only"> : {def.label}</span></button
												>
											{:else}
												{#if rule.evidence}
													<form
														method="POST"
														action="?/addLink"
														class="flex flex-wrap items-end gap-2"
														use:enhance
													>
														<input type="hidden" name="milestoneId" value={step.id} />
														<label class="block grow space-y-1 font-medium">
															{EVIDENCE_LABELS[rule.evidence.kind]}{rule.evidence.required
																? ''
																: ' (facultatif)'}
															<input
																name="url"
																type="url"
																required
																autocomplete="off"
																placeholder="https://"
																class="w-full rounded-md border bg-background p-2 font-normal"
															/>
														</label>
														<button class="min-h-11 rounded-full border px-4"
															>Ajouter le lien</button
														>
													</form>
												{/if}
												{#if rule.attester}
													<form
														method="POST"
														action="?/askConfirm"
														class="flex flex-wrap items-end gap-2"
														use:enhance
													>
														<input type="hidden" name="milestoneId" value={step.id} />
														<label class="block grow space-y-1 font-medium">
															{rule.attester === 'MEMBER'
																? 'Un autre membre présent ce jour-là'
																: 'Une personne hors du groupe qui y était'}
															<input
																name="handle"
																required
																autocomplete="off"
																placeholder="@son-identifiant"
																class="w-full rounded-md border bg-background p-2 font-normal"
															/>
														</label>
														<button
															class="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
															>Demander de confirmer</button
														>
													</form>
												{/if}
												<p class="text-muted-foreground">
													Une fois corroborée, l’étape rapporte bien plus au groupe et à ses
													membres.
												</p>
												<button
													type="button"
													class="min-h-11 text-muted-foreground underline"
													onclick={() => (proofOpen = null)}>Fermer</button
												>
											{/if}
										{/if}
									</div>
								{/if}
							</li>
						{/each}
					</ol>
					{#if manager && !dissolved}
						<div class="space-y-3 border-t pt-3">
							{#each releaseSteps as def (def.key)}
								{@const step = stepOf(def.key)}
								{#if !step}
									<form
										method="POST"
										action="?/verifyRelease"
										class="flex flex-wrap items-end gap-3"
										use:enhance
									>
										<input type="hidden" name="key" value={def.key} />
										<label class="block space-y-1 text-sm font-medium">
											<span>{def.label} · date de sortie</span>
											<input
												type="date"
												name="day"
												required
												min={MIN_MILESTONE_DATE}
												max={today}
												value={today}
												class="block rounded-md border bg-background p-2 font-normal"
											/>
										</label>
										<label class="block space-y-1 text-sm font-medium">
											<span>Identifiant</span>
											<select
												name="kind"
												class="block rounded-md border bg-background p-2 font-normal"
											>
												<option value="UPC">UPC</option>
												<option value="ISRC">ISRC</option>
											</select>
										</label>
										<label class="block min-w-56 grow space-y-1 text-sm font-medium">
											<span>UPC ou ISRC</span>
											<input
												name="value"
												required
												autocomplete="off"
												class="w-full rounded-md border bg-background p-2 font-normal"
											/>
										</label>
										<button
											class="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
											>Vérifier {def.label.toLowerCase()}</button
										>
									</form>
								{/if}
							{/each}
							<p class="text-sm text-muted-foreground">
								La vérification compare le code, le nom du groupe et le type de sortie dans
								MusicBrainz.
							</p>
						</div>
					{/if}
					<p class="text-sm text-muted-foreground">
						Ensuite : {laterSteps.join(', ').toLowerCase()}. Ces étapes demanderont une preuve.
					</p>
				{/if}
			</section>
		{/if}

		{#if member}
			<section class="space-y-3" aria-labelledby="works-title">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 id="works-title" class="flex items-center gap-2 text-xl font-bold">
						<Music class="size-5" aria-hidden="true" /> Morceaux
					</h2>
					{#if manager && !dissolved}
						<a
							href="/morceaux/nouveau?groupe={band.handle}"
							class="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold"
							>Nouvelle idée</a
						>
					{/if}
				</div>
				{#if data.programHref}
					<p class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
						<a
							href={data.programHref}
							download
							data-sveltekit-reload
							class="inline-flex min-h-11 items-center gap-1 font-semibold text-primary underline"
						>
							<FileDown class="size-4" aria-hidden="true" /> Programme des œuvres (PDF)
						</a>
						<span class="text-muted-foreground"
							>À remettre à l’organisateur d’un concert, avec vos morceaux composés.</span
						>
					</p>
				{/if}
				{#if data.works.length === 0}
					<p class="text-sm text-muted-foreground">
						Pas encore de morceau. Une idée reste entre vous ; une fois composée avec une maquette,
						elle apparaît sur la page du groupe.
					</p>
				{:else}
					<ul class="grid gap-3 sm:grid-cols-2">
						{#each data.works as w (w.id)}
							<li>
								<a
									href="/morceaux/{w.id}"
									class="flex min-h-11 items-center justify-between gap-2 rounded-2xl border bg-card p-4 hover:border-primary"
								>
									<span class="truncate font-semibold">{w.title}</span>
									<span class="shrink-0 text-xs text-muted-foreground"
										>{w.state === 'COMPOSED' ? 'Composé' : 'Idée'}</span
									>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		{#if manager && !dissolved}
			<section class="space-y-3" aria-labelledby="invite-title">
				<h2 id="invite-title" class="text-xl font-bold">Inviter quelqu’un</h2>
				{#if data.candidates.length > 0}
					<p class="text-sm text-muted-foreground">Ton réseau et tes conversations :</p>
					<ul class="flex flex-wrap gap-2" aria-label="Personnes à inviter">
						{#each data.candidates as c (c.handle)}
							<li>
								<form method="POST" action="?/invite" use:enhance>
									<input type="hidden" name="handle" value={c.handle} />
									<button class="min-h-11 rounded-full border px-3 text-sm hover:bg-muted"
										>Inviter {c.displayName}</button
									>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
				<form
					method="POST"
					action="?/invite"
					class="flex flex-wrap items-end gap-2"
					use:enhance={() =>
						async ({ result, update }) => {
							if (result.type === 'success') handle = '';
							await update({ reset: false });
						}}
				>
					<label class="block grow space-y-1 text-sm font-medium">
						Son identifiant
						<input
							name="handle"
							required
							autocomplete="off"
							bind:value={handle}
							placeholder="@malik-batterie"
							class="w-full rounded-md border bg-background p-2 font-normal"
						/>
					</label>
					<button
						class="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
						>Inviter</button
					>
				</form>
				{#if band.invitations.length > 0}
					<ul class="grid gap-2 sm:grid-cols-2" aria-label="Invitations en attente">
						{#each band.invitations as i (i.membershipId)}
							<li
								class="flex items-center justify-between gap-2 rounded-2xl border bg-card px-4 py-2 text-sm"
							>
								<span>{i.name} · invitation en attente</span>
								<form method="POST" action="?/withdraw" use:enhance>
									<input type="hidden" name="membershipId" value={i.membershipId} />
									<button class="min-h-11 px-2 text-muted-foreground underline">Retirer</button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		{#if band.past.length > 0}
			<section class="space-y-3" aria-labelledby="past-title">
				<h2 id="past-title" class="text-xl font-bold">Ils et elles y ont joué</h2>
				<ul class="grid gap-x-6 gap-y-1 text-sm md:grid-cols-2" aria-label="Anciens membres">
					{#each band.past as m (m.membershipId)}
						<li>
							{#if m.handle}
								<a href="/@{m.handle}" class="font-semibold underline">{m.name}</a>
							{:else}
								<span class="font-semibold">{m.name}</span>
							{/if}
							<span class="text-muted-foreground"
								>{m.title ? ` · ${m.title}` : ''} · {period(m)}</span
							>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if manager && data.verification}
			<!-- Organisation vérifiée (P3-09) : SIRET et lien officiel, contrôlés à la main. -->
			<section class="space-y-3" aria-labelledby="verify-title">
				<h2 id="verify-title" class="flex items-center gap-2 text-xl font-bold">
					<BadgeCheck class="size-5" aria-hidden="true" /> Groupe vérifié
				</h2>
				{#if data.verification.verifiedAt}
					<p class="text-sm">Votre groupe est vérifié : le badge s’affiche sur sa page publique.</p>
				{:else if data.verification.last?.status === 'PENDING'}
					<p class="text-sm" role="status">
						Votre demande est en cours d’examen par l’équipe. Le badge apparaîtra dès qu’elle sera
						acceptée.
					</p>
				{:else if !dissolved}
					<p class="text-sm text-muted-foreground">
						Votre groupe est déclaré (association, entreprise) ? Donnez son SIRET et son site ou
						réseau officiel : l’équipe vérifie à la main, et un badge « vérifié » rassure les lieux
						et les organisateurs. Ça ne rapporte pas de points.
					</p>
					{#if data.verification.last?.status === 'REJECTED'}
						<p class="rounded-md border border-destructive/50 p-3 text-sm">
							Dernière demande refusée{data.verification.last.reason
								? ` : ${data.verification.last.reason}`
								: '.'}
						</p>
					{/if}
					<form
						method="POST"
						action="?/requestVerification"
						class="grid gap-3 sm:grid-cols-2"
						use:enhance
					>
						<label class="block space-y-1 text-sm font-medium">
							SIRET
							<input
								name="siret"
								required
								inputmode="numeric"
								autocomplete="off"
								placeholder="123 456 789 00012"
								class="w-full rounded-md border bg-background p-2 font-normal"
							/>
						</label>
						<label class="block space-y-1 text-sm font-medium">
							Site ou réseau officiel
							<input
								name="officialUrl"
								type="url"
								required
								placeholder="https://www.instagram.com/…"
								class="w-full rounded-md border bg-background p-2 font-normal"
							/>
						</label>
						<button
							class="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground sm:w-fit"
							>Demander la vérification</button
						>
					</form>
				{/if}
			</section>
		{/if}

		{#if member && !dissolved}
			<section class="space-y-3 border-t pt-6" aria-labelledby="me-title">
				<h2 id="me-title" class="text-lg font-bold">Ma place dans le groupe</h2>
				<form method="POST" action="?/title" class="flex flex-wrap items-end gap-2" use:enhance>
					<label class="block grow space-y-1 text-sm font-medium">
						Ce que j’y fais
						<input
							name="title"
							autocomplete="off"
							maxlength={MAX_MEMBER_TITLE}
							value={band.my?.title ?? ''}
							placeholder="basse, chœurs"
							class="w-full rounded-md border bg-background p-2 font-normal"
						/>
					</label>
					<button class="min-h-11 rounded-full border px-4 text-sm">Enregistrer</button>
				</form>
				{#if !confirmLeave}
					<button
						type="button"
						class="min-h-11 text-sm text-muted-foreground underline"
						onclick={() => (confirmLeave = true)}>Quitter le groupe</button
					>
				{:else}
					<div class="space-y-2 rounded-2xl border p-4 text-sm">
						<p>
							{owner && band.members.length <= 1
								? 'Tu es seul·e : quitter le groupe le dissout. Son historique reste.'
								: owner
									? 'Transmets d’abord le groupe à un autre membre (« Gérer »).'
									: 'Tu resteras dans l’historique du groupe, avec tes dates.'}
						</p>
						<div class="flex gap-2">
							{#if !(owner && band.members.length > 1)}
								<form method="POST" action="?/leave" use:enhance>
									<button
										class="min-h-11 rounded-full border border-destructive px-4 text-destructive"
										>{owner ? 'Dissoudre le groupe' : 'Quitter le groupe'}</button
									>
								</form>
							{/if}
							<button
								type="button"
								class="min-h-11 rounded-full border px-4"
								onclick={() => (confirmLeave = false)}>Annuler</button
							>
						</div>
					</div>
				{/if}
			</section>
		{/if}
	</div>
</div>
