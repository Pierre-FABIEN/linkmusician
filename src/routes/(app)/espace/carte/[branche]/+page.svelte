<script lang="ts">
	// LINKMUSICIAN: page d'une branche de la carte (N2), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import Tile from '#lib/components/linkmusician/metro/Tile.svelte';
	import TrialState from '#lib/components/linkmusician/career/TrialState.svelte';
	import { TONE_OF } from '#lib/components/linkmusician/metro/tones';
	import { BRANCH_ICON } from '#lib/components/linkmusician/career/branchIcons';
	import { ArrowRight, CircleCheck, Clock, Lock } from 'lucide-svelte';

	let { data } = $props();
	const d = $derived(data.detail);
	const Icon = $derived(BRANCH_ICON[data.branch.id]);
	const date = (value: Date | null) =>
		value
			? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'Europe/Paris' }).format(
					value
				)
			: null;
</script>

<SEO title="{data.branch.label} · Ma carte de carrière" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<MetroPageHeader
			kicker="Ma carte · branche"
			title={data.branch.label}
			intro={data.branch.pitch}
			back={{ href: '/espace/carte', label: 'Toutes les branches' }}
		/>

		{#if d.possible.length > 0}
			<section class="space-y-3" aria-labelledby="possible-title">
				<h2 id="possible-title" class="lm-kicker text-muted-foreground">Possible maintenant</h2>
				<ul class="grid gap-3 sm:grid-cols-2">
					{#each d.possible as p (p.href + p.label)}
						<li class="min-w-0">
							<Tile tone={TONE_OF.career} href={p.href} class="lm-tile--flow h-full space-y-2 p-4">
								<p class="lm-tile__text wrap-break-word">{p.reason}</p>
								<p class="flex items-center gap-1 font-semibold">
									{p.label}<ArrowRight class="size-4" aria-hidden="true" />
								</p>
							</Tile>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if d.inProgress.length > 0}
			<section class="space-y-3" aria-labelledby="progress-title">
				<h2 id="progress-title" class="lm-kicker text-muted-foreground">En cours</h2>
				<ul class="lm-tile lm-tile--flow divide-y text-sm">
					{#each d.inProgress as item, i (i)}
						<li class="p-3 wrap-break-word">
							{#if item.href}<a href={item.href} class="underline">{item.text}</a>
							{:else}{item.text}{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if d.done.length > 0}
			<section class="space-y-3" aria-labelledby="done-title">
				<h2 id="done-title" class="lm-kicker text-muted-foreground">Réalisé</h2>
				<ul class="lm-tile lm-tile--flow divide-y text-sm">
					{#each d.done as r (r.key)}
						<li class="flex flex-wrap items-start justify-between gap-2 p-3">
							<span class="min-w-0 wrap-break-word {r.retired ? 'line-through' : ''}">
								{r.label}
								{#if date(r.occurredAt)}<span class="text-muted-foreground">
										· {date(r.occurredAt)}</span
									>{/if}
							</span>
							<span class="lm-pill" data-proof={r.confirmed ? 'confirmed' : 'declared'}>
								{#if r.confirmed}<CircleCheck class="size-3.5" aria-hidden="true" />{/if}
								{r.proof}
							</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="space-y-3" aria-labelledby="trials-title">
			<h2 id="trials-title" class="lm-kicker text-muted-foreground">Premières fois et épreuves</h2>
			{#if d.firstTimes.length > 0}
				<ul class="flex flex-wrap gap-2" aria-label="Premières fois">
					{#each d.firstTimes as f (f.key)}
						<li class="lm-pill max-w-full wrap-break-word">{f.label} · {f.proof}</li>
					{/each}
				</ul>
			{/if}
			<ul class="space-y-3">
				{#each d.acts as a (a.number)}
					<li>
						<Tile tone={TONE_OF.neutral} icon={Icon} class="lm-tile--flow space-y-2 p-4">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<h3 class="text-lg font-semibold">{a.name}</h3>
								<span class="flex flex-wrap gap-1">
									{#if a.highlighted}<span class="lm-pill">Ton ambition</span>{/if}
									<TrialState name="Épreuve" state={a.state} />
								</span>
							</div>
							<p class="text-sm text-muted-foreground">{a.content}</p>
							<p class="text-sm"><strong>Épreuve :</strong> {a.trial}</p>
							{#if a.bonusTrial}
								<p class="flex items-start gap-1.5 text-sm">
									{#if a.bonusTrial.done}
										<CircleCheck class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
									{/if}
									<span>
										<strong>Pour aller plus loin :</strong>
										{a.bonusTrial.label}
										{#if a.bonusTrial.done}<span class="font-semibold">Faite !</span>{/if}
									</span>
								</p>
							{/if}
							{#if a.unlocks.some((u) => u.href)}
								<div class="text-sm">
									<p class="font-medium">
										{a.state === 'passed' ? 'Ce que ça t’a ouvert :' : 'Ce que ça ouvre :'}
									</p>
									<ul class="mt-1 space-y-1">
										{#each a.unlocks.filter((u) => u.href) as u (u.label)}
											<li class="flex items-center gap-2">
												{#if a.state === 'passed' && u.href}
													<a href={u.href} class="underline">{u.label}</a>
												{:else}
													<Lock class="size-3.5 shrink-0" aria-hidden="true" />
													<span>{u.label}</span>
												{/if}
											</li>
										{/each}
									</ul>
								</div>
							{/if}
							{#if a.number === 2 && data.soloOnly}
								<p class="text-sm">
									Tu as composé seul·e : ces morceaux comptent dans ta branche Création. L’épreuve «
									La création » se franchit avec un morceau composé à plusieurs, chaque rôle
									confirmé, avec une maquette.
								</p>
							{/if}
						</Tile>
					</li>
				{/each}
			</ul>
		</section>

		{#if d.notYet.length > 0}
			<section class="space-y-3" aria-labelledby="notyet-title">
				<h2 id="notyet-title" class="lm-kicker text-muted-foreground">
					Pas possible pour l’instant
				</h2>
				<ul class="lm-tile lm-tile--flow divide-y text-sm">
					{#each d.notYet as line (line)}
						<li class="flex items-start gap-2 p-3">
							<Clock class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
							<span class="min-w-0 wrap-break-word">{line}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
</div>
