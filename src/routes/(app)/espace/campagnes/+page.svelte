<script lang="ts">
	// LINKMUSICIAN: « Hors projet » (P3, U2), voir +page.server.ts. Ranger un
	// morceau ouvre la fiche du projet choisi, morceau présélectionné : le
	// partage s'y choisit (jamais « Travail » par défaut, §9.3).
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import MetroEmpty from '#lib/components/linkmusician/metro/MetroEmpty.svelte';
	import { Badge } from '#shadcn/badge';
	import { Music } from 'lucide-svelte';
	import { RECORDING_SUMMARY_LABELS } from '#lib/works/production';

	let { data } = $props();
	type Row = (typeof data.outside)[number];
	const credits = (n: number) => `${n} crédit${n > 1 ? 's' : ''} confirmé${n > 1 ? 's' : ''}`;
	const line = (w: Row) => [w.band?.name, credits(w.credits)].filter(Boolean).join(' · ');
	const empty = $derived(data.outside.length + data.ranged.length + data.others.length === 0);
</script>

<SEO title="Hors projet" noindex nofollow />

{#snippet badges(w: Row)}
	<span class="flex flex-wrap gap-2">
		<Badge variant={w.state === 'IDEA' ? 'outline' : 'secondary'}
			>{w.state === 'IDEA' ? 'Idée' : 'Composé'}</Badge
		>
		{#if w.recording}
			<!-- LINKMUSICIAN: DASH-06d, enregistrement fait ou déclaré. -->
			<Badge variant="outline">{RECORDING_SUMMARY_LABELS[w.recording]}</Badge>
		{/if}
		{#if w.openRoles > 0}
			<Badge
				>{w.openRoles} place{w.openRoles > 1 ? 's' : ''} libre{w.openRoles > 1 ? 's' : ''}</Badge
			>
		{/if}
	</span>
{/snippet}

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-8">
		<MetroPageHeader
			kicker="Collab · Mes projets"
			title="Hors projet"
			intro="Tes morceaux peuvent exister sans projet. Tu peux les rassembler quand tu le souhaites."
		/>
		{#if data.toConfirm.length > 0}
			<p class="rounded-2xl border-2 border-primary/40 bg-card p-4 text-sm">
				On te crédite sur {data.toConfirm.length} morceau{data.toConfirm.length > 1 ? 'x' : ''} :
				<a href="/morceaux" class="font-semibold underline">confirmer mon rôle</a>
			</p>
		{/if}

		{#if empty}
			<MetroEmpty
				icon={Music}
				text="Pas encore de morceau. Note une idée, crédite les personnes qui y jouent, ajoute une maquette."
				action={{ href: '/morceaux/nouveau', label: 'Nouvelle idée' }}
			/>
		{:else}
			<section aria-labelledby="hors-projet" class="space-y-3">
				<h2 id="hors-projet" class="lm-kicker text-muted-foreground">
					Rangés nulle part <span>· {data.outside.length}</span>
				</h2>
				{#if data.outside.length === 0}
					<p class="text-sm text-muted-foreground">
						Tous les morceaux que tu gères sont rangés dans au moins un de tes projets.
					</p>
				{:else}
					<ul class="space-y-3" aria-label="Morceaux hors projet">
						{#each data.outside as w (w.id)}
							<li class="lm-tile lm-tile--flow space-y-3 p-4" data-testid="outside-work">
								<div class="flex flex-wrap items-center justify-between gap-2">
									<span>
										<a href="/morceaux/{w.id}" class="block font-semibold underline">{w.title}</a>
										<span class="text-sm text-muted-foreground">{line(w)}</span>
									</span>
									{@render badges(w)}
								</div>
								{#if data.targets.length > 0}
									<details>
										<summary class="min-h-11 cursor-pointer py-2 text-sm font-medium"
											>Ranger dans un projet<span class="sr-only"> : {w.title}</span></summary
										>
										<ul class="space-y-1 pt-1 text-sm">
											{#each data.targets as t (t.id)}
												<li>
													<a
														href="/projets/{t.id}?ranger={w.id}#ranger"
														class="inline-flex min-h-11 items-center underline"
														>{t.name}<span class="text-muted-foreground"
															>&nbsp;· {t.kindLabel}{t.owner ? ` · ${t.owner}` : ''}</span
														></a
													>
												</li>
											{/each}
										</ul>
									</details>
								{:else}
									<a
										href="/projets/nouveau"
										class="inline-flex min-h-11 items-center text-sm underline"
										>Créer un projet pour le ranger</a
									>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			{#if data.ranged.length > 0}
				<section aria-labelledby="ranges" class="space-y-3">
					<h2 id="ranges" class="lm-kicker text-muted-foreground">
						Déjà dans un projet <span>· {data.ranged.length}</span>
					</h2>
					<ul class="space-y-3" aria-label="Morceaux rangés">
						{#each data.ranged as w (w.id)}
							<li class="lm-tile lm-tile--flow space-y-2 p-4" data-testid="ranged-work">
								<div class="flex flex-wrap items-center justify-between gap-2">
									<a href="/morceaux/{w.id}" class="font-semibold underline">{w.title}</a>
									{@render badges(w)}
								</div>
								<p class="text-sm text-muted-foreground">
									Dans :
									{#each w.projects as proj, i (proj.id)}{i > 0 ? ', ' : ''}<a
											href="/projets/{proj.id}"
											class="underline">{proj.name}</a
										>{proj.statusLabel !== 'En cours'
											? ` (${proj.statusLabel.toLowerCase()})`
											: ''}{/each}
								</p>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if data.others.length > 0}
				<section aria-labelledby="autres" class="space-y-3">
					<h2 id="autres" class="lm-kicker text-muted-foreground">
						Gérés par d’autres <span>· {data.others.length}</span>
					</h2>
					<p class="text-sm text-muted-foreground">
						Tu y es crédité·e, ou ils appartiennent à un groupe dont tu es membre : leur gestion
						décide de leur rangement.
					</p>
					<ul class="space-y-3" aria-label="Morceaux gérés par d’autres">
						{#each data.others as w (w.id)}
							<li>
								<a
									href="/morceaux/{w.id}"
									class="lm-tile lm-tile--flow flex min-h-16 flex-wrap items-center justify-between gap-2 p-4"
								>
									<span>
										<span class="block font-semibold">{w.title}</span>
										<span class="text-sm text-muted-foreground">{line(w)}</span>
									</span>
									{@render badges(w)}
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
			<a href="/morceaux/nouveau" class="inline-block font-semibold underline">Nouvelle idée</a>
		{/if}
	</div>
</div>
