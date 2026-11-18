<script lang="ts">
	// LINKMUSICIAN: carte de carrière parallèle (N2), voir +page.server.ts.
	// Héros : la première épreuve à portée et son seul geste ; puis, au plus,
	// deux autres ; puis la mosaïque des branches, chacune vers sa page.
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import MetroEmpty from '#lib/components/linkmusician/metro/MetroEmpty.svelte';
	import Tile from '#lib/components/linkmusician/metro/Tile.svelte';
	import TrialState from '#lib/components/linkmusician/career/TrialState.svelte';
	import { TONE_OF } from '#lib/components/linkmusician/metro/tones';
	import { ArrowRight, Compass, Target } from 'lucide-svelte';
	import { AMBITION_INFO } from '#lib/career/ambition';
	import { BRANCH_INFO } from '#lib/career/map';
	import { BRANCH_ICON } from '#lib/components/linkmusician/career/branchIcons';

	let { data } = $props();
	const m = $derived(data.map);
	const hero = $derived(m.withinReach[0] ?? null);
	const others = $derived(m.withinReach.slice(1));
	const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
</script>

<SEO title="Ma carte de carrière" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-5xl space-y-6">
		<MetroPageHeader
			kicker="Mode carrière"
			title="Ma carte de carrière"
			intro="Des branches qui avancent chacune à son rythme. Chaque épreuve est prouvée par quelqu’un d’autre, et aucune n’en attend une autre."
		/>
		{#if data.ambition}
			<p class="text-sm">
				Mis en avant pour ton ambition : <strong>{AMBITION_INFO[data.ambition].label}</strong>.
				<a href="/espace/ambition" class="underline">Changer</a>
			</p>
		{/if}

		<section class="space-y-3" aria-labelledby="reach-title">
			<h2 id="reach-title" class="lm-kicker text-muted-foreground">À portée</h2>
			{#if hero?.reach}
				<Tile tone={TONE_OF.career} icon={Target} class="lm-tile--flow space-y-3 p-5">
					<p class="lm-tile__kicker">
						{BRANCH_INFO[hero.branch].label}{hero.highlighted ? ' · ton ambition' : ''}
					</p>
					<h3 class="lm-tile__title wrap-break-word">{hero.name}</h3>
					<p class="lm-tile__text wrap-break-word">{hero.reach.reason}</p>
					<a href={hero.reach.action.href} class="lm-btn min-h-11">
						{hero.reach.action.label}<ArrowRight class="size-4" aria-hidden="true" />
					</a>
				</Tile>
				{#if others.length > 0}
					<ul class="grid gap-3 sm:grid-cols-2" aria-label="Autres épreuves à portée">
						{#each others as a (a.number)}
							{#if a.reach}
								<li class="min-w-0">
									<Tile
										tone={TONE_OF.nextStep}
										href={a.reach.action.href}
										class="lm-tile--flow h-full space-y-1 p-4"
									>
										<p class="lm-tile__kicker">{BRANCH_INFO[a.branch].label}</p>
										<h3 class="font-semibold wrap-break-word">{a.name}</h3>
										<p class="lm-tile__text wrap-break-word">{a.reach.reason}</p>
										<p class="text-sm font-semibold underline">{a.reach.action.label}</p>
									</Tile>
								</li>
							{/if}
						{/each}
					</ul>
				{/if}
			{:else}
				<MetroEmpty
					icon={Compass}
					title="Rien n’attend de geste de ta part"
					text="Chaque branche reste ouverte : commence par celle qui te parle, dans l’ordre que tu veux."
				/>
			{/if}
		</section>

		<section class="space-y-3" aria-labelledby="branches-title">
			<h2 id="branches-title" class="lm-kicker text-muted-foreground">Tes branches</h2>
			<ul class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Branches de la carrière">
				{#each m.branches as b, i (b.branch)}
					{@const Icon = BRANCH_ICON[b.branch]}
					<li class="min-w-0 {b.soon ? 'col-span-2' : ''}">
						<Tile
							href="/espace/carte/{b.slug}"
							tone={b.soon ? TONE_OF.neutral : TONE_OF.work}
							icon={Icon}
							index={i}
							class="lm-tile--flow flex h-full min-h-32 flex-col gap-2 p-4"
						>
							<div class="flex flex-wrap items-center justify-between gap-1">
								<h3 class="lm-tile__kicker">{b.label}</h3>
								{#if b.passedCount > 0}
									<span class="lm-pill">
										✓ {b.passedCount}<span class="sr-only">
											: {plural(b.passedCount, 'épreuve franchie', 'épreuves franchies')}</span
										>
									</span>
								{/if}
							</div>
							{#if b.soon}
								<p class="lm-tile__text wrap-break-word">Bientôt sur Melokiva : {b.pitch}</p>
							{:else if b.figures.length > 0}
								<ul class="space-y-0.5 text-sm wrap-break-word">
									{#each b.figures as f (f)}<li>{f}</li>{/each}
								</ul>
							{:else}
								<p class="lm-tile__text wrap-break-word">{b.pitch}</p>
							{/if}
							{#if !b.soon}
								<ul class="mt-auto flex flex-wrap gap-1" aria-label="Épreuves · {b.label}">
									{#each b.trials as t (t.number)}
										<li><TrialState name={t.name} state={t.state} /></li>
									{/each}
								</ul>
							{/if}
						</Tile>
					</li>
				{/each}
			</ul>
		</section>
	</div>
</div>
