<script lang="ts">
	// LINKMUSICIAN: confirmer une étape de groupe (P3-05), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import { EVIDENCE_LABELS } from '#lib/milestones/proofs';
	import { PROOF_LABELS } from '#lib/milestones/rules';
	import { Flag } from 'lucide-svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.message) toast.success(form.message);
	});

	const step = $derived(data.step);
	const day = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Europe/Paris'
	});
</script>

<SEO title="Confirmer une étape" noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<div class="mx-auto max-w-xl space-y-6">
		<div class="space-y-2">
			<p class="flex items-center gap-2 text-sm text-muted-foreground">
				<Flag class="size-4" aria-hidden="true" /> Étape de groupe à confirmer
			</p>
			<h1 class="text-3xl font-black tracking-tight">{step.label}</h1>
			<p>
				<a href="/@{step.band.handle}" class="font-semibold underline">{step.band.name}</a>
				· {day.format(new Date(step.occurredAt))}{step.note ? ` · ${step.note}` : ''}
			</p>
		</div>

		{#if form?.error}
			<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
				{form.error}
			</p>
		{/if}

		{#if step.evidence.length > 0}
			<ul class="space-y-1 text-sm" aria-label="Liens joints">
				{#each step.evidence as e (e.url)}
					<li class="break-all">
						<a href={e.url} class="underline" target="_blank" rel="noopener noreferrer"
							>{EVIDENCE_LABELS[e.kind]}</a
						>
					</li>
				{/each}
			</ul>
		{/if}

		{#if step.status === 'REQUESTED'}
			<div class="space-y-4 rounded-2xl border bg-card p-4">
				<p>
					{step.requestedBy ?? 'Le groupe'} te demande de confirmer cette étape{step.role ===
					'MEMBER'
						? ', comme membre présent ce jour-là'
						: ', comme personne extérieure au groupe'}.
				</p>
				<p class="text-sm text-muted-foreground">
					Confirme seulement si tu y étais. Ta confirmation compte pour le parcours du groupe ; une
					fausse confirmation peut être signalée et retirée.
				</p>
				<div class="flex flex-wrap gap-2">
					<form method="POST" action="?/confirm" use:enhance>
						<button
							class="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
							>Je confirme, j’y étais</button
						>
					</form>
					<form method="POST" action="?/decline" use:enhance>
						<button class="min-h-11 rounded-full border px-4">Je n’y étais pas</button>
					</form>
				</div>
			</div>
		{:else}
			<p class="rounded-2xl border bg-card p-4">
				{step.status === 'CONFIRMED'
					? 'Tu as confirmé cette étape. Merci !'
					: 'Tu as indiqué que tu n’y étais pas.'}
				L’étape est aujourd’hui
				<strong>{PROOF_LABELS[step.proof].toLowerCase()}</strong>.
			</p>
		{/if}
	</div>
</div>
