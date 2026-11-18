<script lang="ts">
	// LINKMUSICIAN: « Mes contributions » (U1, conception 20 §10.2), voir
	// +page.server.ts. Une colonne : filtres par famille de rôle (seulement
	// celles qui ont des lignes), une liste par année, et la fiche de carrière.
	// Aucun point ni niveau ici : la progression vit dans « repères » (D54).
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import MetroChoice from '#lib/components/linkmusician/metro/MetroChoice.svelte';
	import MetroList from '#lib/components/linkmusician/metro/MetroList.svelte';
	import MetroEmpty from '#lib/components/linkmusician/metro/MetroEmpty.svelte';
	import { BadgeCheck, FileText, Handshake } from 'lucide-svelte';
	import {
		CONTRIBUTION_CATEGORY_LABELS,
		PROOF_HINTS,
		PROOF_LABELS,
		byYear,
		type ContributionFilter,
		type ContributionProof
	} from '#lib/career/contributions';

	let { data } = $props();

	const options = $derived([
		{ value: 'TOUT' as ContributionFilter, label: 'Tout' },
		...data.categories.map((c) => ({
			value: c as ContributionFilter,
			label: CONTRIBUTION_CATEGORY_LABELS[c]
		}))
	]);
	const groups = $derived(byYear(data.lines));

	/** Le filtre se relit côté serveur (`?role=`), l'adresse reste partageable avec soi-même. */
	function choose(value: ContributionFilter) {
		const url = new URL(page.url.href);
		url.searchParams.delete('page');
		if (value === 'TOUT') url.searchParams.delete('role');
		else url.searchParams.set('role', data.slugs[value]);
		goto(url, { reset: false, replace: true });
	}
	function moreHref(next: number) {
		const url = new URL(page.url.href);
		url.searchParams.set('page', String(next));
		return `${url.pathname}${url.search}`;
	}

	const TONE: Record<ContributionProof, string> = {
		CONFIRMED: 'lime',
		CREDITED: 'blue',
		DECLARED: 'paper'
	};
	const month = (d: Date) =>
		new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Europe/Paris' }).format(d);
</script>

<SEO title="Mes contributions" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<MetroPageHeader
			kicker="Ma musique"
			title="Mes contributions"
			intro="Ce que tu as réalisé et qui le confirme."
			back={{ href: '/espace', label: 'Mon espace' }}
		/>

		{#if data.categories.length > 1}
			<MetroChoice
				label="Filtrer par rôle"
				{options}
				bind:value={() => data.filter as ContributionFilter, choose}
			/>
		{/if}

		{#if data.lines.length === 0}
			<MetroEmpty
				icon={Handshake}
				title="Rien pour l’instant"
				text="Tes collaborations terminées et tes crédits confirmés apparaîtront ici, avec qui les confirme. Ce qui s’est fait hors de Melokiva compte tout autant : cette page ne montre que ce qui y a été confirmé."
				action={{ href: '/morceaux', label: 'Voir mes morceaux' }}
			/>
		{:else}
			<p class="text-sm text-muted-foreground" aria-live="polite">
				{data.total}
				{data.total > 1 ? 'réalisations' : 'réalisation'}
				{#if data.filter !== 'TOUT'}
					· {CONTRIBUTION_CATEGORY_LABELS[data.filter]}{/if}
			</p>
			{#each groups as group (group.year ?? 'sans-date')}
				<section class="space-y-2" aria-labelledby="annee-{group.year ?? 'sans-date'}">
					<h2 id="annee-{group.year ?? 'sans-date'}" class="lm-kicker text-muted-foreground">
						{group.year ?? 'Sans date'}
					</h2>
					<MetroList
						items={group.lines}
						key={(l) => l.key}
						label="Contributions {group.year ?? 'sans date'}"
						href={(l) => l.href}
					>
						{#snippet row(l)}
							<div class="min-w-0 flex-1 space-y-1">
								<p class="font-medium wrap-break-word">
									{l.title}{#if l.with}<span class="font-normal text-muted-foreground">
											· {l.with}</span
										>{/if}
								</p>
								<p class="text-sm text-muted-foreground wrap-break-word">
									{l.roles.join(', ')}{#if l.date}
										· {month(l.date)}{/if}{#each l.notes as note (note)}
										· {note}{/each}
								</p>
							</div>
							<span
								class="lm-pill shrink-0 text-xs"
								data-tone={l.frozen ? 'amber' : TONE[l.proof]}
								title={l.frozen ? 'contestée, en attente de la modération' : PROOF_HINTS[l.proof]}
							>
								{#if l.proof === 'CONFIRMED' && !l.frozen}<BadgeCheck
										class="inline size-3.5"
										aria-hidden="true"
									/>{/if}
								{l.frozen ? 'En vérification' : PROOF_LABELS[l.proof]}
							</span>
						{/snippet}
					</MetroList>
				</section>
			{/each}
			{#if data.nextPage}
				<a class="lm-btn" data-variant="ghost" href={moreHref(data.nextPage)}>Voir plus</a>
			{/if}
			<p class="text-sm text-muted-foreground">
				<strong>Confirmé</strong> : {PROOF_HINTS.CONFIRMED}. <strong>Crédité·e</strong> :
				{PROOF_HINTS.CREDITED}. <strong>Déclaré</strong> : {PROOF_HINTS.DECLARED}.
			</p>
		{/if}

		<a href="/espace/fiche" class="lm-list__row lm-tile lm-tile--flow">
			<span class="lm-list__icon"><FileText class="size-5" aria-hidden="true" /></span>
			<span class="min-w-0">
				<span class="block font-medium">Ma fiche de carrière</span>
				<span class="block text-sm text-muted-foreground">Le résumé que tu peux partager.</span>
			</span>
		</a>
	</div>
</div>
