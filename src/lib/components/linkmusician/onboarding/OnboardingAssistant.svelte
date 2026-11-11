<script lang="ts">
	/**
	 * LINKMUSICIAN: assistant d'inscription (P3-17, D47). Aide facultative,
	 * repliée par défaut : la personne lit l'avis, donne son accord, décrit sa
	 * situation, puis relit chaque proposition (retirer est toujours possible).
	 * « Utiliser ces propositions » ne fait que pré-remplir les écrans : rien
	 * n'est enregistré avant l'envoi des formulaires habituels.
	 */
	import { untrack } from 'svelte';
	import { Sparkles, X } from 'lucide-svelte';
	import { Button } from '#shadcn/button';
	import { TRACKS } from '#lib/actors/tracks';
	import { LOOKING_FOR_LABELS } from '#lib/actors/profile';
	import { INSTRUMENT_LEVELS } from '#lib/skills/levels';
	import {
		ASSISTANT_MAX_CHARS,
		ASSISTANT_MIN_CHARS,
		type Proposals
	} from '#lib/onboarding/assistant';
	import { reportUsage, saveProposals } from '#lib/onboarding/proposals';

	let {
		remaining: initialRemaining,
		onApply
	}: { remaining: number; onApply: (p: Proposals) => void } = $props();

	let remaining = $state(untrack(() => initialRemaining));
	let consent = $state(false);
	let text = $state('');
	let busy = $state(false);
	let message = $state<string | null>(null);
	let removedNote = $state(0);
	let proposals = $state<Proposals | null>(null);
	let applied = $state(false);

	const length = $derived(text.trim().length);
	const canAnalyse = $derived(
		consent &&
			!busy &&
			remaining > 0 &&
			length >= ASSISTANT_MIN_CHARS &&
			length <= ASSISTANT_MAX_CHARS
	);
	const levelLabel = (level: number | null) =>
		level ? INSTRUMENT_LEVELS.find((l) => l.level === level)?.label : 'niveau à choisir';
	const count = $derived(
		proposals
			? proposals.tracks.length +
					proposals.instruments.length +
					proposals.genres.length +
					(proposals.communeQuery ? 1 : 0) +
					(proposals.radiusKm ? 1 : 0) +
					proposals.lookingFor.length
			: 0
	);

	async function analyse() {
		if (!canAnalyse) return;
		busy = true;
		message = null;
		proposals = null;
		try {
			const res = await fetch('/api/onboarding/assistant', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ text, consent })
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				message = body.message ?? 'L’aide ne répond pas. Rien n’a été enregistré.';
				if (body.code === 'quota') remaining = 0;
				return;
			}
			proposals = body.proposals;
			remaining = body.remaining;
			removedNote = body.removed ?? 0;
		} catch {
			message =
				'L’aide ne répond pas. Rien n’a été enregistré : continue avec les écrans habituels.';
		} finally {
			busy = false;
		}
	}

	function drop<K extends 'tracks' | 'instruments' | 'genres' | 'lookingFor'>(
		key: K,
		index: number
	) {
		if (!proposals) return;
		proposals[key] = proposals[key].filter((_, i) => i !== index) as Proposals[K];
		reportUsage('removed');
	}
	function dropCommune() {
		if (!proposals) return;
		proposals.communeQuery = null;
		proposals.radiusKm = null;
		reportUsage('removed');
	}

	function apply() {
		if (!proposals) return;
		const snapshot = $state.snapshot(proposals) as Proposals;
		saveProposals(snapshot);
		onApply(snapshot);
		reportUsage('applied', count);
		applied = true;
	}
	function ignore() {
		proposals = null;
		reportUsage('ignored');
	}
</script>

<details class="group rounded-lg border p-4">
	<summary class="flex min-h-11 cursor-pointer items-center gap-2 font-medium">
		<Sparkles class="size-4 text-primary" aria-hidden="true" />
		Décris ta situation avec tes mots
		<span class="text-sm text-muted-foreground">(facultatif)</span>
	</summary>

	<div class="mt-3 space-y-4 text-sm">
		{#if applied}
			<p role="status" class="rounded-md bg-muted p-3">
				C’est noté : tes métiers sont cochés ci-dessous, et les écrans suivants seront pré-remplis.
				Vérifie chaque écran avant de continuer.
			</p>
		{:else if proposals}
			<div class="space-y-3" aria-live="polite">
				<p class="font-medium">
					Voici ce que l’aide propose. Retire ce qui ne va pas ; tu pourras tout modifier sur chaque
					écran.
				</p>
				{#if removedNote > 0}
					<p class="text-muted-foreground">
						Des coordonnées (email, téléphone, adresse…) ont été retirées avant l’envoi.
					</p>
				{/if}
				{#snippet chip(label: string, onRemove: () => void)}
					<li
						class="inline-flex items-center gap-1 rounded-full border bg-background py-1 pr-1 pl-3"
					>
						{label}
						<button
							type="button"
							class="grid size-8 place-items-center rounded-full hover:bg-muted"
							aria-label="Retirer {label}"
							onclick={onRemove}><X class="size-3.5" aria-hidden="true" /></button
						>
					</li>
				{/snippet}
				{#if proposals.tracks.length}
					<div>
						<p class="text-muted-foreground">Métiers</p>
						<ul class="flex flex-wrap gap-2">
							{#each proposals.tracks as t, i (t)}{@render chip(TRACKS[t].label, () =>
									drop('tracks', i)
								)}{/each}
						</ul>
					</div>
				{/if}
				{#if proposals.instruments.length}
					<div>
						<p class="text-muted-foreground">Instruments</p>
						<ul class="flex flex-wrap gap-2">
							{#each proposals.instruments as inst, i (inst.instrumentId)}{@render chip(
									`${inst.name} · ${levelLabel(inst.level)}`,
									() => drop('instruments', i)
								)}{/each}
						</ul>
					</div>
				{/if}
				{#if proposals.genres.length}
					<div>
						<p class="text-muted-foreground">Genres</p>
						<ul class="flex flex-wrap gap-2">
							{#each proposals.genres as g, i (g.id)}{@render chip(g.name, () =>
									drop('genres', i)
								)}{/each}
						</ul>
					</div>
				{/if}
				{#if proposals.communeQuery || proposals.radiusKm}
					<div>
						<p class="text-muted-foreground">Ville (à choisir dans la liste)</p>
						<ul class="flex flex-wrap gap-2">
							{@render chip(
								[proposals.communeQuery, proposals.radiusKm ? `${proposals.radiusKm} km` : null]
									.filter(Boolean)
									.join(' · '),
								dropCommune
							)}
						</ul>
					</div>
				{/if}
				{#if proposals.lookingFor.length}
					<div>
						<p class="text-muted-foreground">Tu cherches</p>
						<ul class="flex flex-wrap gap-2">
							{#each proposals.lookingFor as v, i (v)}{@render chip(LOOKING_FOR_LABELS[v], () =>
									drop('lookingFor', i)
								)}{/each}
						</ul>
					</div>
				{/if}
				<div class="flex flex-wrap gap-2">
					<Button type="button" onclick={apply} disabled={count === 0}
						>Utiliser ces propositions</Button
					>
					<Button type="button" variant="ghost" onclick={ignore}>Ignorer</Button>
				</div>
			</div>
		{:else}
			<div class="rounded-md bg-muted p-3 text-muted-foreground">
				<p>
					Ton texte est envoyé à notre fournisseur d’IA (Anthropic) pour préparer des propositions.
					LinkMusician ne le conserve pas. N’écris ni adresse, ni téléphone, ni email : on les
					retire avant l’envoi. Rien n’est enregistré tant que tu n’as pas validé chaque écran.
				</p>
			</div>
			<label class="flex items-start gap-2">
				<input type="checkbox" bind:checked={consent} class="mt-0.5 size-4" />
				<span>J’ai compris, je veux essayer l’aide.</span>
			</label>
			<label class="block space-y-1">
				<span class="font-medium">Ta situation</span>
				<textarea
					bind:value={text}
					maxlength={ASSISTANT_MAX_CHARS}
					rows="5"
					disabled={!consent}
					placeholder="Ex. : Je joue de la guitare depuis le lycée, plutôt rock et blues, je me débrouille bien en groupe. J’habite à Blagnac et je cherche un groupe ou des jams."
					class="lm-field block w-full"
				></textarea>
				<span class="block text-xs text-muted-foreground">
					{length}/{ASSISTANT_MAX_CHARS} · {remaining} analyse{remaining > 1 ? 's' : ''} restante{remaining >
					1
						? 's'
						: ''}
				</span>
			</label>
			<Button type="button" onclick={analyse} disabled={!canAnalyse}>
				{busy ? 'Analyse en cours…' : 'Préparer des propositions'}
			</Button>
		{/if}
		{#if message}<p role="alert" class="text-destructive">{message}</p>{/if}
	</div>
</details>
