<script lang="ts">
	// LINKMUSICIAN: page publique d'un média, voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import MediaPlayer from '#lib/components/linkmusician/MediaPlayer.svelte';
	import { REPORT_REASONS, REPORT_REASON_LABELS, MAX_REPORT_DETAILS } from '#lib/moderation/rules';
	import SEO from '#lib/components/SEO.svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.reported) toast.success(form.reported);
		if (form?.error) toast.error(form.error);
	});
	const m = $derived(data.media);
</script>

<SEO title={m.title} />

<div class="min-h-screen w-screen px-4 {data.memberShell ? 'pt-6 pb-24' : 'py-24'}">
	<article class="mx-auto max-w-2xl space-y-4">
		<h1 class="text-2xl font-bold">{m.title}</h1>
		<p class="text-sm text-muted-foreground">
			{m.isDemo ? 'Démo' : 'Média'} de {m.actor.displayName} (@{m.actor.handle}){m.instrument
				? ` · ${m.instrument}`
				: ''}
		</p>
		<MediaPlayer media={m} />

		{#if data.canReport}
			<details class="rounded-lg border p-3 text-sm">
				<summary class="cursor-pointer text-muted-foreground">Signaler</summary>
				<form method="POST" action="?/report" use:enhance class="mt-3 space-y-3">
					<fieldset class="space-y-1">
						<legend class="font-medium">Que veux-tu signaler ?</legend>
						<label class="flex items-center gap-2"
							><input type="radio" name="target" value="MEDIA" checked class="size-4" /> Ce média</label
						>
						<label class="flex items-center gap-2"
							><input type="radio" name="target" value="ACTOR" class="size-4" /> Le profil de {m
								.actor.displayName}</label
						>
					</fieldset>
					<div class="space-y-1">
						<label for="reason" class="block font-medium">Motif</label>
						<select
							id="reason"
							name="reason"
							required
							class="w-full rounded-md border bg-background p-2"
						>
							<option value="">—</option>
							{#each REPORT_REASONS as r (r)}
								<option value={r}>{REPORT_REASON_LABELS[r]}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1">
						<label for="details" class="block font-medium">Précisions (facultatif)</label>
						<textarea
							id="details"
							name="details"
							rows="3"
							maxlength={MAX_REPORT_DETAILS}
							class="w-full rounded-md border bg-background p-2"
						></textarea>
					</div>
					<button type="submit" class="rounded-md border px-3 py-1.5">Envoyer le signalement</button
					>
				</form>
			</details>
		{/if}
	</article>
</div>
