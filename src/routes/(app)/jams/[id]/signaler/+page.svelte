<script lang="ts">
	// LINKMUSICIAN: « La jam n'a pas lieu » (#91b), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import { TriangleAlert } from 'lucide-svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});
	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Paris'
	});
	const field = 'lm-field w-full';
</script>

<SEO title="La jam n’a pas lieu ? · {data.jam.title}" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<article class="mx-auto max-w-3xl space-y-6">
		<div class="space-y-2">
			<a href="/jams/{data.jam.id}" class="text-sm text-muted-foreground underline"
				>← {data.jam.title}</a
			>
			<h1 class="lm-title">
				{data.isOrganizer ? 'Un problème signalé sur ta jam' : 'La jam n’a pas lieu ?'}
			</h1>
			<p class="text-sm text-muted-foreground">{day.format(new Date(data.jam.startsAt))}</p>
		</div>

		{#if data.isOrganizer}
			{#if data.incident}
				<section class="lm-alert space-y-2 p-4" role="status">
					<p class="flex items-center gap-2 font-semibold">
						<TriangleAlert class="size-5" aria-hidden="true" />
						Un problème a été signalé sur ta jam.
					</p>
					<p class="text-sm">
						Tu ne sais pas qui : c’est voulu. Rien n’est décidé, et aucune sanction n’est
						automatique. Explique ce qui s’est passé, ou annule la jam si elle n’a pas lieu.
					</p>
				</section>
				{#if data.incident.status === 'OPEN'}
					<form method="POST" action="?/respond" use:enhance class="space-y-3">
						<label class="block space-y-1 font-medium">
							Ta réponse (lue par la modération)
							<textarea
								name="response"
								required
								minlength="3"
								maxlength="1000"
								rows="4"
								class={field}>{data.incident.response ?? ''}</textarea
							>
						</label>
						<button class="lm-btn">Envoyer ma réponse</button>
					</form>
					{#if !data.cancelled}
						<a href="/jams/{data.jam.id}" class="lm-btn" data-variant="ghost"
							>Annuler la jam depuis sa fiche</a
						>
					{/if}
				{:else}
					<p class="text-sm">La modération a examiné le signalement.</p>
				{/if}
			{:else}
				<p class="lm-tile lm-tile--flow p-4 text-sm">Aucun problème n’est signalé sur ta jam.</p>
			{/if}
		{:else}
			<p class="text-sm text-muted-foreground">
				Tu t’es rendu·e sur place et la jam n’avait pas lieu ? Dis-le : l’organisation est prévenue
				sans savoir qui a signalé, les autres inscrit·es reçoivent un avertissement prudent, et la
				modération examine. Une jam sans public ou annulée de bonne foi n’est pas une faute.
			</p>
			{#if data.myReport}
				<p class="lm-tile lm-tile--flow p-4 text-sm">
					Tu as déjà signalé cette jam. Tu peux corriger ton signalement ci-dessous.
				</p>
			{/if}
			{#if data.canReport}
				<form method="POST" action="?/report" use:enhance class="space-y-4">
					<fieldset class="space-y-2">
						<legend class="font-medium">Qu’est-ce qui s’est passé ?</legend>
						{#each data.reasons as r (r.value)}
							<label class="flex min-h-11 items-center gap-2">
								<input
									type="radio"
									name="reason"
									value={r.value}
									required
									checked={data.myReport?.reason === r.value}
									class="size-5"
								/>
								{r.label}
							</label>
						{/each}
					</fieldset>
					<label class="flex items-start gap-2">
						<input type="checkbox" name="wentThere" required class="mt-1 size-5" />
						<span>Je me suis rendu·e sur place.</span>
					</label>
					<label class="block space-y-1 font-medium">
						Précisions (facultatif)
						<textarea name="details" maxlength="1000" rows="3" class={field}
							>{data.myReport?.details ?? ''}</textarea
						>
					</label>
					<button class="lm-btn" data-variant="danger">Signaler</button>
				</form>
			{/if}
		{/if}
	</article>
</div>
