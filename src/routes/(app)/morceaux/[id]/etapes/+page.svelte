<script lang="ts">
	// LINKMUSICIAN: « Qui prend en charge ? » (DASH-06a), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import {
		WORK_STEP_ACTION_LABELS,
		WORK_STEP_ACT_LABELS,
		WORK_STEP_KIND_LABELS,
		WORK_STEP_PLACE_LABELS,
		WORK_STEP_STATUS_LABELS
	} from '#lib/works/steps';
	import { House, UserRound, Users, Megaphone, Clock } from 'lucide-svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.message) toast.success(form.message);
	});

	const day = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Europe/Paris'
	});
	const moment = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Paris'
	});
	// Confirmation explicite avant « Terminer », une par étape.
	let confirmFinish = $state<Record<string, boolean>>({});
</script>

<SEO title="Qui prend en charge ? · {data.work.title}" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<article class="mx-auto max-w-3xl space-y-6">
		<div class="space-y-2">
			<a href="/morceaux/{data.work.id}" class="text-sm text-muted-foreground underline"
				>← {data.work.title}</a
			>
			<h1 class="lm-title">Qui prend en charge ?</h1>
			<p class="text-sm text-muted-foreground">
				Une étape peut se faire soi-même, sans collaboration ni studio. Ce que tu déclares ici reste
				dans l’équipe du morceau. Terminée, elle fait avancer le morceau comme une déclaration : ce
				n’est pas une preuve et cela ne rapporte pas de points.
			</p>
		</div>

		{#if form?.error}
			<p role="alert" class="lm-alert p-3 text-sm">{form.error}</p>
		{/if}

		{#each data.steps as step (step.kind)}
			<section class="lm-tile lm-tile--flow space-y-4 p-4" aria-labelledby="step-{step.kind}">
				<div class="flex flex-wrap items-baseline justify-between gap-2">
					<h2 id="step-{step.kind}" class="text-xl font-bold">
						{WORK_STEP_KIND_LABELS[step.kind]}
					</h2>
					{#if step.assigned}
						<span class="lm-pill lm-pill--lg" data-tone={step.status === 'DONE' ? 'lime' : 'paper'}>
							{WORK_STEP_STATUS_LABELS[step.status]}
						</span>
					{/if}
				</div>

				{#if step.assigned}
					<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
						<dt class="text-muted-foreground">Responsable</dt>
						<dd>{step.mine ? 'Toi' : step.assignee}{step.mode === 'SELF' ? ' (soi-même)' : ''}</dd>
						{#if step.place}
							<dt class="text-muted-foreground">Lieu</dt>
							<dd>{WORK_STEP_PLACE_LABELS[step.place]} · aucune adresse enregistrée</dd>
						{/if}
						{#if step.startedAt}
							<dt class="text-muted-foreground">Commencé</dt>
							<dd>
								<time datetime={new Date(step.startedAt).toISOString()}
									>{day.format(new Date(step.startedAt))}</time
								>
							</dd>
						{/if}
						{#if step.doneAt}
							<dt class="text-muted-foreground">Terminé</dt>
							<dd>
								<time datetime={new Date(step.doneAt).toISOString()}
									>{day.format(new Date(step.doneAt))}</time
								>
								· déclaré par {step.mine ? 'toi' : step.assignee}
							</dd>
						{/if}
					</dl>
				{:else if data.work.manage}
					<!-- Les quatre réponses ; seule « Moi-même » enregistre une prise en charge. -->
					<ul class="grid gap-2 sm:grid-cols-2" aria-label="Qui prend en charge l’étape">
						<li class="lm-tile lm-tile--flow space-y-2 border-2 border-primary p-3">
							<p class="flex items-center gap-2 font-semibold">
								<UserRound class="size-4" aria-hidden="true" /> Moi-même
							</p>
							<p class="flex items-center gap-2 text-sm text-muted-foreground">
								<House class="size-4" aria-hidden="true" />
								Dans mon home studio : pas d’adresse, pas de fiche studio publiée.
							</p>
							<form method="POST" action="?/step" use:enhance>
								<input type="hidden" name="kind" value={step.kind} />
								<input type="hidden" name="revision" value={step.revision} />
								<input type="hidden" name="action" value="claim" />
								<button class="lm-btn w-full">{WORK_STEP_ACTION_LABELS.claim}</button>
							</form>
						</li>
						<li class="lm-tile lm-tile--flow space-y-2 p-3">
							<p class="flex items-center gap-2 font-semibold">
								<Users class="size-4" aria-hidden="true" /> Une personne de l’équipe
							</p>
							<p class="text-sm text-muted-foreground">
								Crédite-la sur le morceau : elle confirme elle-même.
							</p>
							<a class="lm-btn" data-variant="ghost" href="/morceaux/{data.work.id}#credits-title"
								>Créditer quelqu’un</a
							>
						</li>
						<li class="lm-tile lm-tile--flow space-y-2 p-3">
							<p class="flex items-center gap-2 font-semibold">
								<Megaphone class="size-4" aria-hidden="true" /> Un·e professionnel·le
							</p>
							<p class="text-sm text-muted-foreground">
								Une annonce que seuls les ingés son verront.
							</p>
							{#if data.externalHref}
								<a class="lm-btn" data-variant="ghost" href={data.externalHref}
									>Trouver un·e ingé son</a
								>
							{/if}
						</li>
						<li class="lm-tile lm-tile--flow space-y-2 p-3">
							<p class="flex items-center gap-2 font-semibold">
								<Clock class="size-4" aria-hidden="true" /> Plus tard
							</p>
							<p class="text-sm text-muted-foreground">
								Rien n’est enregistré : tu pourras revenir ici quand tu veux.
							</p>
						</li>
					</ul>
				{:else}
					<p class="text-sm text-muted-foreground">Personne ne s’en charge pour l’instant.</p>
				{/if}

				{#if step.assigned && step.actions.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each step.actions as action (action)}
							<form method="POST" action="?/step" use:enhance class="contents">
								<input type="hidden" name="kind" value={step.kind} />
								<input type="hidden" name="revision" value={step.revision} />
								<input type="hidden" name="action" value={action} />
								{#if action === 'finish'}
									<div class="w-full space-y-2">
										<label class="flex min-h-11 items-center gap-2 text-sm">
											<input
												type="checkbox"
												name="confirm"
												value="1"
												class="size-4"
												bind:checked={confirmFinish[step.kind]}
											/>
											Je confirme que l’enregistrement est terminé.
										</label>
										<button class="lm-btn" disabled={!confirmFinish[step.kind]}
											>{WORK_STEP_ACTION_LABELS.finish}</button
										>
									</div>
								{:else}
									<button
										class="lm-btn"
										data-variant={action === 'start' || action === 'reopen' ? undefined : 'ghost'}
										>{WORK_STEP_ACTION_LABELS[action]}</button
									>
								{/if}
							</form>
						{/each}
					</div>
				{/if}

				{#if step.mine && step.status === 'DONE' && step.kind === 'RECORDING'}
					<!-- LINKMUSICIAN: DASH-06d, après l'enregistrement : crédit puis suite. -->
					<div
						role="group"
						aria-label="Et maintenant"
						class="lm-tile lm-tile--flow space-y-3 p-3 text-sm"
					>
						{#if data.recordingCredit === 'addable'}
							<p>Ton nom à la prise de son ? Il s’ajoute à ton crédit, sans en créer un second.</p>
							<form method="POST" action="?/creditRecording" use:enhance>
								<button class="lm-btn">Ajouter « Prise de son » à mon crédit</button>
							</form>
						{:else if data.recordingCredit === 'held'}
							<p class="text-muted-foreground">« Prise de son » figure dans ton crédit.</p>
						{/if}
						{#if data.mixHref}
							<p>Prochaine étape : le mixage.</p>
							<div class="flex flex-wrap gap-2">
								<a class="lm-btn" data-variant="ghost" href={data.mixHref}
									>Trouver un·e ingé son pour le mixage</a
								>
								<a class="lm-btn" data-variant="ghost" href="/morceaux/{data.work.id}"
									>Voir le morceau</a
								>
							</div>
						{/if}
					</div>
				{/if}

				{#if step.history.length > 0}
					<details class="text-sm">
						<summary class="min-h-11 cursor-pointer content-center font-medium">
							Historique de l’étape
						</summary>
						<ol
							class="mt-2 space-y-1"
							aria-label="Historique de l’étape {WORK_STEP_KIND_LABELS[step.kind]}"
						>
							{#each step.history as act (act.id)}
								<li>
									<span class="font-medium">{WORK_STEP_ACT_LABELS[act.kind]}</span>
									· {act.author}{act.kind === 'RELEASED' && act.assignee
										? ` (responsable : ${act.assignee})`
										: ''}
									·
									<time datetime={new Date(act.occurredAt).toISOString()}
										>{moment.format(new Date(act.occurredAt))}</time
									>
								</li>
							{/each}
						</ol>
					</details>
				{/if}
			</section>
		{/each}

		<p class="text-sm text-muted-foreground">
			Mixage, mastering et production arrivent ensuite, avec la même règle : la personne responsable
			déclare, personne ne le fait à sa place.
		</p>
	</article>
</div>
