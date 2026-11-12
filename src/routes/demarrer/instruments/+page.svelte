<script lang="ts">
	// LINKMUSICIAN: onboarding, étape « Instruments » (P1-10).
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { X } from 'lucide-svelte';
	import * as Card from '#shadcn/card';
	import { Button } from '#shadcn/button';
	import { INSTRUMENT_FAMILY_LABELS } from '#lib/skills/instruments';
	import { INSTRUMENT_LEVELS } from '#lib/skills/levels';
	import { ONBOARDING_MAX_INSTRUMENTS } from '#lib/onboarding/steps';
	import SEO from '#lib/components/SEO.svelte';
	import { onMount } from 'svelte';
	import ProposedNotice from '#lib/components/linkmusician/onboarding/ProposedNotice.svelte';
	import { reportUsage, takeProposal } from '#lib/onboarding/proposals';

	let { data, form } = $props();

	let rows = $state(
		untrack(() => data.current.map((c) => ({ instrumentId: c.instrumentId, level: c.level })))
	);
	let primary = $state(untrack(() => data.current.find((c) => c.isPrimary)?.instrumentId ?? null));
	let toAdd = $state('');

	// Assistant d'inscription (P3-17) : instruments proposés, niveau à
	// confirmer s'il n'a pas été dit.
	let proposed = $state(false);
	onMount(() => {
		const p = takeProposal('instruments');
		if (!p?.length || rows.length) return;
		rows = p.map((i) => ({ instrumentId: i.instrumentId, level: i.level ?? 0 }));
		primary = rows[0]?.instrumentId ?? null;
		proposed = true;
	});
	function ignoreProposals() {
		rows = [];
		primary = null;
		proposed = false;
		reportUsage('ignored');
	}

	const names = $derived(
		new Map(data.families.flatMap((f) => f.instruments.map((i) => [i.id, i.name] as const)))
	);
	const chosen = $derived(new Set(rows.map((r) => r.instrumentId)));
	const payload = $derived(JSON.stringify({ instruments: rows, primaryInstrumentId: primary }));
	const ready = $derived(rows.length > 0 && rows.every((r) => r.level > 0));

	function add() {
		if (!toAdd || chosen.has(toAdd) || rows.length >= ONBOARDING_MAX_INSTRUMENTS) return;
		rows = [...rows, { instrumentId: toAdd, level: 0 }];
		if (rows.length === 1) primary = toAdd;
		toAdd = '';
	}
	function remove(id: string) {
		rows = rows.filter((r) => r.instrumentId !== id);
		if (primary === id) primary = rows[0]?.instrumentId ?? null;
	}
	const descriptor = (level: number) =>
		INSTRUMENT_LEVELS.find((l) => l.level === level)?.descriptor;
</script>

<SEO title="Tes instruments" noindex nofollow />

<Card.Root class="shadow-xl">
	<Card.Content class="space-y-5">
		<div>
			<h1 class="lm-title lm-title--sm">Tes instruments</h1>
			<p class="text-sm text-muted-foreground">
				1 à {ONBOARDING_MAX_INSTRUMENTS} pour commencer (la voix compte). Le niveau se lit « je peux…
				» ; il restera affiché comme <em>déclaré</em>.
			</p>
		</div>

		{#if proposed}<ProposedNotice onIgnore={ignoreProposals} />{/if}

		{#each rows as row, i (row.instrumentId)}
			{@const name = names.get(row.instrumentId) ?? '?'}
			<div class="lm-tile lm-tile--flow space-y-2 p-3">
				<div class="flex items-center justify-between">
					<span class="font-semibold">{name}</span>
					<button
						type="button"
						class="rounded p-1 text-muted-foreground hover:text-foreground"
						aria-label="Retirer {name}"
						onclick={() => remove(row.instrumentId)}
					>
						<X class="size-4" />
					</button>
				</div>
				<select class="lm-field w-full" aria-label="Niveau en {name}" bind:value={rows[i].level}>
					<option value={0} disabled>Choisis ton niveau</option>
					{#each INSTRUMENT_LEVELS as l (l.level)}<option value={l.level}
							>{l.level} · {l.label}</option
						>{/each}
				</select>
				{#if row.level}<p class="text-sm text-muted-foreground">
						Je peux {descriptor(row.level)}.
					</p>{/if}
				{#if rows.length > 1}
					<label class="flex items-center gap-2 text-sm">
						<input
							type="radio"
							name="primary-choice"
							value={row.instrumentId}
							bind:group={primary}
							class="size-4"
						/> Mon instrument principal
					</label>
				{/if}
			</div>
		{/each}

		{#if rows.length < ONBOARDING_MAX_INSTRUMENTS}
			<select
				class="lm-field w-full"
				aria-label="Instrument à ajouter"
				bind:value={toAdd}
				onchange={add}
			>
				<option value="">+ Ajouter un instrument…</option>
				{#each data.families as { family, instruments } (family)}
					<optgroup label={INSTRUMENT_FAMILY_LABELS[family]}>
						{#each instruments as inst (inst.id)}<option
								value={inst.id}
								disabled={chosen.has(inst.id)}>{inst.name}</option
							>{/each}
					</optgroup>
				{/each}
			</select>
		{/if}

		{#if form?.error}<p class="text-sm text-destructive" role="alert">{form.error}</p>{/if}

		<form method="POST" use:enhance class="flex justify-between pt-2">
			<input type="hidden" name="payload" value={payload} />
			<Button variant="ghost" href="/qui-es-tu">Retour</Button>
			<Button type="submit" disabled={!ready}>Continuer</Button>
		</form>
	</Card.Content>
</Card.Root>
