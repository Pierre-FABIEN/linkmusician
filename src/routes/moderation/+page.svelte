<script lang="ts">
	// LINKMUSICIAN: file de modération, voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import MediaPlayer from '#lib/components/linkmusician/MediaPlayer.svelte';
	import { REPORT_REASON_LABELS, type ReportReasonValue } from '#lib/moderation/rules';
	import SEO from '#lib/components/SEO.svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});

	const date = (d: Date | string) =>
		new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
	import MetroPage from '#lib/components/linkmusician/metro/MetroPage.svelte';
</script>

<SEO title="Modération" noindex nofollow />

<MetroPage>
	<div class="min-h-screen w-screen px-4 py-24">
		<div class="mx-auto max-w-3xl space-y-10">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h1 class="lm-title lm-title--sm">Modération</h1>
				<a
					href="/moderation/journal"
					class="inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold"
					>Journal des décisions</a
				>
			</div>

			<section class="space-y-4" aria-labelledby="orgs-title">
				<h2 id="orgs-title" class="text-lg font-semibold">
					Organisations à vérifier ({data.verifications.length})
				</h2>
				<p class="text-sm text-muted-foreground">
					Le SIRET est-il actif, au nom de l’organisation ? Le lien officiel est-il le sien ?
				</p>
				{#if data.verifications.length === 0}<p class="text-sm text-muted-foreground">
						Rien en attente.
					</p>{/if}
				{#each data.verifications as v (v.id)}
					<article
						class="lm-tile lm-tile--flow space-y-3 p-4 text-sm"
						aria-label="Vérification de {v.org.displayName}"
					>
						<div>
							<p>
								<a href="/@{v.org.handle}" class="font-medium underline">{v.org.displayName}</a>
								· {v.members} membre{v.members > 1 ? 's' : ''} · demandé par {v.requestedBy
									?.displayName ?? 'un compte supprimé'} le {date(v.createdAt)}
							</p>
							<p>
								SIRET
								<a href={v.annuaire} class="underline" target="_blank" rel="noopener noreferrer"
									>{v.siret}</a
								>
								{#if v.foundName}
									· Sirene : <span class="font-medium">{v.foundName}</span>{v.naf
										? ` (NAF ${v.naf})`
										: ''}
								{/if}
							</p>
							<a
								href={v.officialUrl}
								class="break-all underline"
								target="_blank"
								rel="noopener noreferrer">{v.officialUrl}</a
							>
						</div>
						<div class="flex flex-wrap items-end gap-2">
							<form method="POST" action="?/approveOrganization" use:enhance>
								<input type="hidden" name="requestId" value={v.id} />
								<button class="lm-btn">Vérifier</button>
							</form>
							<form
								method="POST"
								action="?/rejectOrganization"
								use:enhance
								class="flex items-end gap-2"
							>
								<input type="hidden" name="requestId" value={v.id} />
								<label>
									<span class="sr-only">Motif du refus</span>
									<input name="reason" required placeholder="Motif du refus" class="lm-field" />
								</label>
								<button class="rounded-md border px-3 py-1.5 text-destructive">Refuser</button>
							</form>
						</div>
					</article>
				{/each}
			</section>

			<section class="space-y-4" aria-labelledby="claims-title">
				<h2 id="claims-title" class="text-lg font-semibold">
					Lieux à revendiquer ({data.venueClaims.length})
				</h2>
				<p class="text-sm text-muted-foreground">
					Le code est-il publié sur la page indiquée ? Cette page est-elle bien celle du lieu
					(compte ancien, adresse, photos) ?
				</p>
				{#if data.venueClaims.length === 0}<p class="text-sm text-muted-foreground">
						Rien en attente.
					</p>{/if}
				{#each data.venueClaims as c (c.id)}
					<article
						class="lm-tile lm-tile--flow space-y-3 p-4 text-sm"
						aria-label="Revendication de {c.venue.name}"
					>
						<div class="space-y-1">
							<p>
								<a href="/lieux/{c.venue.id}" class="font-medium underline">{c.venue.name}</a>
								· {c.venue.communeName} · demandé par {c.requestedBy?.displayName ??
									'un compte supprimé'}{c.submittedAt ? ` le ${date(c.submittedAt)}` : ''}
							</p>
							<p>
								Code attendu : <strong class="font-mono">{c.code}</strong>
								{#if c.venue.annuaire}
									·
									<a
										href={c.venue.annuaire}
										class="underline"
										target="_blank"
										rel="noopener noreferrer">fiche Insee</a
									>
								{/if}
							</p>
							{#if c.proofUrl}
								<a
									href={c.proofUrl}
									class="break-all underline"
									target="_blank"
									rel="noopener noreferrer">{c.proofUrl}</a
								>
							{/if}
						</div>
						<div class="flex flex-wrap items-end gap-2">
							<form method="POST" action="?/approveVenueClaim" use:enhance>
								<input type="hidden" name="claimId" value={c.id} />
								<button class="lm-btn">Approuver</button>
							</form>
							<form
								method="POST"
								action="?/rejectVenueClaim"
								use:enhance
								class="flex items-end gap-2"
							>
								<input type="hidden" name="claimId" value={c.id} />
								<label>
									<span class="sr-only">Motif du refus pour {c.venue.name}</span>
									<input name="reason" required placeholder="Motif du refus" class="lm-field" />
								</label>
								<button class="rounded-md border px-3 py-1.5 text-destructive">Refuser</button>
							</form>
						</div>
					</article>
				{/each}
			</section>

			<section class="space-y-4" aria-labelledby="verified-title">
				<h2 id="verified-title" class="text-lg font-semibold">
					Organisations vérifiées ({data.verifiedOrgs.length})
				</h2>
				<p class="text-sm text-muted-foreground">
					Retirer la vérification si le SIRET est radié, le lien perdu ou en cas d’abus. Les étapes
					déjà vérifiées restent.
				</p>
				{#if data.verifiedOrgs.length === 0}<p class="text-sm text-muted-foreground">
						Aucune pour l’instant.
					</p>{/if}
				<ul class="lm-tile lm-tile--flow divide-y text-sm">
					{#each data.verifiedOrgs as o (o.orgId)}
						<li class="flex flex-wrap items-end justify-between gap-2 p-3">
							<p>
								<a href="/@{o.org.handle}" class="font-medium underline">{o.org.displayName}</a>
								· vérifiée le {date(o.verifiedAt)}{o.siret ? ` · SIRET ${o.siret}` : ''}
							</p>
							<form
								method="POST"
								action="?/revokeOrganization"
								use:enhance
								class="flex items-end gap-2"
							>
								<input type="hidden" name="orgId" value={o.orgId} />
								<label>
									<span class="sr-only">Motif du retrait pour {o.org.displayName}</span>
									<input name="reason" required placeholder="Motif du retrait" class="lm-field" />
								</label>
								<button class="rounded-md border px-3 py-1.5 text-destructive">Retirer</button>
							</form>
						</li>
					{/each}
				</ul>
			</section>

			<section class="space-y-4" aria-labelledby="pending-title">
				<h2 id="pending-title" class="text-lg font-semibold">
					Médias en attente ({data.pendingMedia.length})
				</h2>
				{#if data.pendingMedia.length === 0}<p class="text-sm text-muted-foreground">
						Rien en attente.
					</p>{/if}
				{#each data.pendingMedia as m (m.id)}
					<article class="lm-tile lm-tile--flow space-y-3 p-4" aria-label="Média {m.title}">
						<div class="flex flex-wrap justify-between gap-2 text-sm">
							<span class="font-medium">{m.title}{m.isDemo ? ' · démo' : ''}</span>
							<span class="text-muted-foreground">@{m.actor.handle} · {date(m.createdAt)}</span>
						</div>
						<MediaPlayer media={m} />
						<div class="flex flex-wrap items-end gap-3">
							<form method="POST" action="?/approve" use:enhance>
								<input type="hidden" name="mediaId" value={m.id} />
								<button type="submit" class="lm-btn">Valider</button>
							</form>
							<form
								method="POST"
								action="?/reject"
								use:enhance
								class="flex flex-wrap items-end gap-2"
							>
								<input type="hidden" name="mediaId" value={m.id} />
								<label class="text-sm">
									<span class="sr-only">Motif du refus</span>
									<input name="reason" placeholder="Motif du refus" class="lm-field" />
								</label>
								<button type="submit" class="rounded-md border px-3 py-1.5 text-sm text-destructive"
									>Refuser</button
								>
							</form>
						</div>
					</article>
				{/each}
			</section>

			<section class="space-y-4" aria-labelledby="collusion-title">
				<h2 id="collusion-title" class="text-lg font-semibold">
					Cercles fermés à vérifier ({data.collusion.length})
				</h2>
				<p class="text-sm text-muted-foreground">
					Des personnes qui ne collaborent et ne s'apprécient qu'entre elles, sans aucun lien avec
					le reste de la scène. Ce n'est qu'une piste : deux amis qui ne jouent qu'ensemble y
					ressemblent aussi. Rien n'est sanctionné d'office.
				</p>
				{#if data.collusion.length === 0}<p class="text-sm text-muted-foreground">
						Rien en attente.
					</p>{/if}
				{#each data.collusion as c (c.id)}
					<article
						class="lm-tile lm-tile--flow space-y-3 p-4 text-sm"
						aria-label="Cercle fermé de {c.members.length} personnes"
					>
						<ul class="flex flex-wrap gap-2">
							{#each c.members as m (m.id)}
								<li class="rounded-full border px-3 py-1">
									<a href="/@{m.handle}" class="font-medium underline">{m.displayName}</a>
									<span class="text-muted-foreground">
										· TL{m.trustLevel} · inscrit·e le {new Date(m.createdAt).toLocaleDateString(
											'fr-FR'
										)}</span
									>
								</li>
							{/each}
						</ul>
						<p class="text-muted-foreground">
							{c.interactions} échanges entre eux (collaborations, appréciations), {Math.round(
								c.density * 100
							)} % des liens possibles · repéré le {date(c.detectedAt)}, revu le {date(
								c.lastSeenAt
							)}
						</p>
						{#if c.sharedIps > 0}
							<p class="lm-note p-2 font-medium" data-tone="amber">
								Mêmes connexions : {c.sharedIps}
								{c.sharedIps > 1 ? 'adresses IP partagées' : 'adresse IP partagée'} entre membres.
							</p>
						{/if}
						<form method="POST" action="?/decideCollusion" use:enhance class="space-y-2">
							<input type="hidden" name="caseId" value={c.id} />
							<label class="block">
								<span class="sr-only">Note de décision</span>
								<input
									name="note"
									placeholder="Note (obligatoire pour confirmer)"
									class="lm-field w-full"
								/>
							</label>
							<div class="flex flex-wrap gap-2">
								<button
									type="submit"
									name="decision"
									value="DISMISSED"
									class="rounded-md border px-3 py-1.5">Rien d'anormal</button
								>
								<button
									type="submit"
									name="decision"
									value="CONFIRMED"
									class="rounded-md border px-3 py-1.5 text-destructive">Collusion confirmée</button
								>
							</div>
							<p class="text-xs text-muted-foreground">
								Confirmer ne sanctionne personne : les avertissements et suspensions se décident à
								part, membre par membre.
							</p>
						</form>
					</article>
				{/each}
			</section>

			<section class="space-y-4" aria-labelledby="disputes-title">
				<h2 id="disputes-title" class="text-lg font-semibold">
					Étapes contestées ({data.disputes.length})
				</h2>
				<p class="text-sm text-muted-foreground">
					Retenir reprend les points de l’étape (transactions liées), la retire du parcours et
					avertit qui l’a déclarée et qui l’a confirmée. Rejeter la dégèle.
				</p>
				{#if data.disputes.length === 0}<p class="text-sm text-muted-foreground">
						Rien en attente.
					</p>{/if}
				{#each data.disputes as d (d.id)}
					<article
						class="lm-tile lm-tile--flow space-y-3 p-4 text-sm"
						aria-label="Étape contestée : {d.label}, {d.band.displayName}"
					>
						<div>
							<p>
								<a href="/@{d.band.handle}" class="font-medium underline">{d.band.displayName}</a>
								· {d.label} · {d.proof}{d.frozen ? ' · gelée' : ''}
							</p>
							<p class="text-muted-foreground">
								{date(d.occurredAt)}{d.note ? ` · ${d.note}` : ''} · déclarée par {d.declaredBy
									?.displayName ?? 'le groupe'}
							</p>
							{#if d.confirmedBy.length > 0}
								<p>
									Confirmée par {d.confirmedBy
										.map(
											(c) => `${c.displayName} (${c.role === 'MEMBER' ? 'membre' : 'hors groupe'})`
										)
										.join(', ')}
								</p>
							{/if}
							{#each d.evidence as e (e.url)}
								<a
									href={e.url}
									class="block break-all underline"
									target="_blank"
									rel="noopener noreferrer">{e.url}</a
								>
							{/each}
						</div>
						<ul class="space-y-1 border-l-2 pl-3" aria-label="Signalements">
							{#each d.reports as r (r.id)}
								<li>
									<span class="text-muted-foreground"
										>@{r.reporter} (palier {r.reporterTrust}) · {date(r.createdAt)} :</span
									>
									{r.details}
								</li>
							{/each}
						</ul>
						<div class="flex flex-wrap items-end gap-2">
							<form
								method="POST"
								action="?/upholdMilestone"
								use:enhance
								class="flex items-end gap-2"
							>
								<input type="hidden" name="milestoneId" value={d.id} />
								<label>
									<span class="sr-only">Motif de la décision</span>
									<input name="note" required placeholder="Pourquoi la retenir" class="lm-field" />
								</label>
								<button type="submit" class="rounded-md border px-3 py-1.5 text-destructive"
									>Retenir</button
								>
							</form>
							<form method="POST" action="?/dismissMilestone" use:enhance>
								<input type="hidden" name="milestoneId" value={d.id} />
								<button type="submit" class="lm-btn">Rejeter</button>
							</form>
						</div>
					</article>
				{/each}
			</section>

			<section class="space-y-4" aria-labelledby="evidence-title">
				<h2 id="evidence-title" class="text-lg font-semibold">
					Preuves de démo à vérifier ({data.pendingEvidence.length})
				</h2>
				<p class="text-sm text-muted-foreground">
					Le lien mène-t-il à une écoute publique, au nom du groupe ?
				</p>
				{#if data.pendingEvidence.length === 0}<p class="text-sm text-muted-foreground">
						Rien en attente.
					</p>{/if}
				{#each data.pendingEvidence as e (e.id)}
					<article
						class="lm-tile lm-tile--flow flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
						aria-label="Preuve de {e.band.displayName}"
					>
						<div class="min-w-0">
							<p>
								<a href="/@{e.band.handle}" class="font-medium underline">{e.band.displayName}</a>
								· {e.label}
							</p>
							<a href={e.url} class="break-all underline" target="_blank" rel="noopener noreferrer"
								>{e.url}</a
							>
							<p class="text-muted-foreground">{date(e.createdAt)}</p>
						</div>
						<div class="flex flex-wrap items-end gap-2">
							<form method="POST" action="?/acceptEvidence" use:enhance>
								<input type="hidden" name="evidenceId" value={e.id} />
								<button type="submit" class="lm-btn">Accepter</button>
							</form>
							<form
								method="POST"
								action="?/rejectEvidence"
								use:enhance
								class="flex items-end gap-2"
							>
								<input type="hidden" name="evidenceId" value={e.id} />
								<label>
									<span class="sr-only">Motif du refus</span>
									<input name="reason" required placeholder="Motif du refus" class="lm-field" />
								</label>
								<button type="submit" class="rounded-md border px-3 py-1.5 text-destructive"
									>Refuser</button
								>
							</form>
						</div>
					</article>
				{/each}
			</section>

			<section class="space-y-4" aria-labelledby="venues-title">
				<h2 id="venues-title" class="text-lg font-semibold">
					Lieux à valider ({data.pendingVenues.length})
				</h2>
				{#if data.pendingVenues.length === 0}<p class="text-sm text-muted-foreground">
						Rien en attente.
					</p>{/if}
				{#each data.pendingVenues as v (v.id)}
					<article
						class="lm-tile lm-tile--flow flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
						aria-label="Lieu {v.name}"
					>
						<div>
							<a href="/lieux/{v.id}" class="font-medium underline">{v.name}</a>
							<p class="text-muted-foreground">
								{v.kind} · {v.communeName} · @{v.by} · {date(v.createdAt)}
							</p>
						</div>
						<div class="flex flex-wrap items-end gap-2">
							<form method="POST" action="?/validateVenue" use:enhance>
								<input type="hidden" name="venueId" value={v.id} />
								<button type="submit" class="lm-btn">Valider</button>
							</form>
							<form method="POST" action="?/removeVenue" use:enhance class="flex items-end gap-2">
								<input type="hidden" name="venueId" value={v.id} />
								<label>
									<span class="sr-only">Motif du retrait</span>
									<input name="reason" required placeholder="Motif du retrait" class="lm-field" />
								</label>
								<button type="submit" class="rounded-md border px-3 py-1.5 text-destructive"
									>Retirer</button
								>
							</form>
						</div>
					</article>
				{/each}
			</section>

			<section class="space-y-4" aria-labelledby="reports-title">
				<h2 id="reports-title" class="text-lg font-semibold">
					Signalements ouverts ({data.openReports.length})
				</h2>
				{#if data.openReports.length === 0}<p class="text-sm text-muted-foreground">
						Aucun signalement.
					</p>{/if}
				{#each data.openReports as r (r.id)}
					<article
						class="lm-tile lm-tile--flow space-y-3 p-4"
						aria-label="Signalement {REPORT_REASON_LABELS[r.reason as ReportReasonValue]}"
					>
						<div class="flex flex-wrap justify-between gap-2 text-sm">
							<span class="font-medium">
								{REPORT_REASON_LABELS[r.reason as ReportReasonValue]} —
								{r.targetType === 'MEDIA'
									? 'média'
									: r.targetType === 'OPPORTUNITY'
										? 'annonce'
										: r.targetType === 'VENUE'
											? 'lieu ajouté par'
											: r.targetType === 'MILESTONE'
												? 'étape de groupe'
												: 'profil'}
								{r.targetType === 'VENUE' || r.targetType === 'MILESTONE' ? '' : 'de '}@{r
									.targetActor.handle}
							</span>
							<span class="text-muted-foreground">par @{r.reporter} · {date(r.createdAt)}</span>
						</div>
						{#if r.details}<p class="whitespace-pre-line text-sm">« {r.details} »</p>{/if}
						{#if r.media}<MediaPlayer media={r.media} />{/if}
						{#if r.opportunity}
							<div class="rounded-md border p-3 text-sm">
								<p class="font-medium">{r.opportunity.title}</p>
								<p class="whitespace-pre-line text-muted-foreground">{r.opportunity.description}</p>
							</div>
						{/if}
						{#if r.venue}
							<div class="rounded-md border p-3 text-sm">
								<p class="font-medium">{r.venue.name}</p>
								<p class="text-muted-foreground">{r.venue.communeName}</p>
							</div>
						{/if}
						{#if r.milestone}
							<div class="rounded-md border p-3 text-sm">
								<p class="font-medium">{r.milestone.definitionId}</p>
								<p class="text-muted-foreground">Preuve : {r.milestone.proof}</p>
							</div>
						{/if}

						<div class="flex flex-wrap items-end gap-3 text-sm">
							<form method="POST" action="?/dismiss" use:enhance>
								<input type="hidden" name="reportId" value={r.id} />
								<button type="submit" class="rounded-md border px-3 py-1.5"
									>Classer sans suite</button
								>
							</form>
							{#if r.opportunity && r.opportunity.status !== 'REMOVED'}
								<form method="POST" action="?/removeOpportunity" use:enhance>
									<input type="hidden" name="opportunityId" value={r.opportunity.id} />
									<input
										type="hidden"
										name="reason"
										value={REPORT_REASON_LABELS[r.reason as ReportReasonValue]}
									/>
									<button type="submit" class="rounded-md border px-3 py-1.5 text-destructive"
										>Retirer l'annonce</button
									>
								</form>
							{/if}
							{#if r.venue && !r.venue.removedAt}
								<form method="POST" action="?/removeVenue" use:enhance>
									<input type="hidden" name="venueId" value={r.venue.id} />
									<input
										type="hidden"
										name="reason"
										value={REPORT_REASON_LABELS[r.reason as ReportReasonValue]}
									/>
									<button type="submit" class="rounded-md border px-3 py-1.5 text-destructive"
										>Retirer le lieu</button
									>
								</form>
							{/if}
							{#if r.media}
								<form method="POST" action="?/reject" use:enhance>
									<input type="hidden" name="mediaId" value={r.media.id} />
									<input
										type="hidden"
										name="reason"
										value={REPORT_REASON_LABELS[r.reason as ReportReasonValue]}
									/>
									<button type="submit" class="rounded-md border px-3 py-1.5 text-destructive"
										>Retirer le média</button
									>
								</form>
							{/if}
						</div>
						<form
							method="POST"
							action="?/sanction"
							use:enhance
							class="flex flex-wrap items-end gap-2 text-sm"
						>
							<input type="hidden" name="reportId" value={r.id} />
							<input type="hidden" name="actorId" value={r.targetActor.id} />
							<label>
								<span class="sr-only">Sanction</span>
								<select name="kind" class="lm-field">
									<option value="WARNING">Avertir (30 jours)</option>
									<option value="SUSPENSION">Suspendre</option>
								</select>
							</label>
							<label>
								<span class="sr-only">Durée de suspension</span>
								<select name="days" class="lm-field">
									<option value="7">7 jours</option>
									<option value="30">30 jours</option>
									<option value="">Jusqu'à levée</option>
								</select>
							</label>
							<label>
								<span class="sr-only">Motif de la sanction</span>
								<input name="reason" required placeholder="Motif de la sanction" class="lm-field" />
							</label>
							<button type="submit" class="rounded-md border px-3 py-1.5">Sanctionner</button>
						</form>
					</article>
				{/each}
			</section>
		</div>
	</div>
</MetroPage>
