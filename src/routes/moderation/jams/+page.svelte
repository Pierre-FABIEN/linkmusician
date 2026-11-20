<script lang="ts">
	// LINKMUSICIAN: jams signalées (#91b), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPage from '#lib/components/linkmusician/metro/MetroPage.svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});
	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Paris'
	});
	const field = 'lm-field w-full';
</script>

<SEO title="Jams signalées" noindex nofollow />

<MetroPage>
	<div class="min-h-screen w-screen px-4 py-24">
		<div class="mx-auto max-w-3xl space-y-10">
			<div class="space-y-2">
				<a href="/moderation" class="text-sm text-muted-foreground underline">← Modération</a>
				<h1 class="lm-title lm-title--sm">Jams signalées</h1>
				<p class="text-sm text-muted-foreground">
					Le nombre de signalements priorise, il ne prouve rien. Une jam sans public, une annulation
					de bonne foi ou un signalement malveillant ne justifient aucune sanction. L’interdiction
					ne touche que l’organisation de jams.
				</p>
			</div>

			<section class="space-y-4" aria-labelledby="incidents-title">
				<h2 id="incidents-title" class="text-lg font-semibold">
					Dossiers à instruire ({data.incidents.length})
				</h2>
				{#if data.incidents.length === 0}
					<p class="text-sm text-muted-foreground">Aucun dossier en cours.</p>
				{/if}
				{#each data.incidents as i (i.id)}
					<article
						class="lm-tile lm-tile--flow space-y-3 p-4 text-sm"
						aria-label="Dossier {i.jam.title}"
					>
						<p class="flex flex-wrap items-center gap-2 font-semibold">
							{i.jam.title}
							{#if i.priority}<span class="lm-pill">Prioritaire</span>{/if}
							{#if i.jam.cancelled}<span class="lm-pill">Annulée</span>{/if}
						</p>
						<p>
							{day.format(new Date(i.jam.startsAt))} · {i.jam.venue?.name}, {i.jam.venue
								?.communeName}
							{i.jam.venueClaimed ? '(lieu revendiqué)' : '(lieu non revendiqué)'}
						</p>
						<p>
							Publiée par <a href="/@{i.jam.issuer.handle}" class="underline"
								>{i.jam.issuer.displayName}</a
							>{#if i.jam.postedBy}, pour <a href="/@{i.jam.postedBy.handle}" class="underline"
									>{i.jam.postedBy.displayName}</a
								>{/if} · {i.jam.registered} inscrit·e{i.jam.registered > 1 ? 's' : ''} · précédents confirmés
							: {i.precedents} · interdictions en cours : {i.activeRestrictions}
						</p>
						<ul class="space-y-2" aria-label="Signalements">
							{#each i.reports as r (r.reporter.handle)}
								<li class="border-l-2 pl-3">
									<strong>{r.reason}</strong> —
									<a href="/@{r.reporter.handle}" class="underline">{r.reporter.displayName}</a
									>{r.recentAccount ? ' (compte récent)' : ''}, {day.format(new Date(r.at))}
									{r.wentThere ? '· dit s’être rendu·e sur place' : ''}
									{#if r.details}<p class="text-muted-foreground">{r.details}</p>{/if}
								</li>
							{/each}
						</ul>
						<p>
							<strong>Réponse de l’organisation :</strong>
							{i.response ?? 'aucune pour l’instant'}
						</p>
						<form method="POST" action="?/decide" use:enhance class="space-y-3 border-t pt-3">
							<input type="hidden" name="incidentId" value={i.id} />
							<label class="block space-y-1 font-medium">
								Motif de la décision (journalisé)
								<textarea name="note" required minlength="3" maxlength="1000" rows="2" class={field}
								></textarea>
							</label>
							<label class="block space-y-1 font-medium">
								Suite, si le manquement est confirmé
								<select name="sanction" class={field} disabled={!i.hasResponsible}>
									{#each data.sanctions as s (s.value)}<option value={s.value}>{s.label}</option
										>{/each}
								</select>
							</label>
							<div class="flex flex-wrap gap-2">
								<button name="decision" value="dismiss" class="lm-btn" data-variant="ghost"
									>Classer</button
								>
								<button name="decision" value="confirm" class="lm-btn" data-variant="danger"
									>Confirmer le manquement</button
								>
							</div>
						</form>
					</article>
				{/each}
			</section>

			<section class="space-y-4" aria-labelledby="restrictions-title">
				<h2 id="restrictions-title" class="text-lg font-semibold">
					Interdictions d’organiser en cours ({data.restrictions.length})
				</h2>
				{#each data.restrictions as r (r.id)}
					<article
						class="lm-tile lm-tile--flow space-y-2 p-4 text-sm"
						aria-label="Interdiction {r.actor.displayName}"
					>
						<p>
							<a href="/@{r.actor.handle}" class="font-semibold underline">{r.actor.displayName}</a>
							— {r.until ? `jusqu’au ${day.format(new Date(r.until))}` : 'sans limite'}
						</p>
						<p class="text-muted-foreground">{r.reason}</p>
						<form method="POST" action="?/lift" use:enhance class="flex flex-wrap items-end gap-2">
							<input type="hidden" name="restrictionId" value={r.id} />
							<label class="min-w-0 flex-1 space-y-1 font-medium">
								Motif de la levée ou du recours
								<input name="note" required minlength="3" class={field} />
							</label>
							<button class="lm-btn" data-variant="ghost">Lever</button>
						</form>
					</article>
				{/each}
			</section>
		</div>
	</div>
</MetroPage>
