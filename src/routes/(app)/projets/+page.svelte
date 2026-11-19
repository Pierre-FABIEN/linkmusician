<script lang="ts">
	// LINKMUSICIAN: « Mes projets » (P3, U2), voir +page.server.ts. Écran à
	// l'essentiel (D50) : les projets en cours en tuiles, « Hors projet » et
	// « Créer un projet » ; atteints et laissés de côté repliés.
	import { page } from '$app/state';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import MetroMenu from '#lib/components/linkmusician/metro/MetroMenu.svelte';
	import MetroEmpty from '#lib/components/linkmusician/metro/MetroEmpty.svelte';
	import ProjectTile from '#lib/components/linkmusician/projects/ProjectTile.svelte';
	import { TONE_OF } from '#lib/components/linkmusician/metro/tones';
	import { FolderOpen, FolderPlus, Music } from 'lucide-svelte';
	import { plural } from '#lib/jam/log';
	import { enhance } from '$app/forms';
	import { PROJECT_KIND_LABELS } from '#lib/projects/rules';
	import { CAPABILITY_LABELS, PRESETS } from '#lib/projects/participants';

	let { data, form } = $props();
	const s = $derived(data.sections);
	const entries = $derived([
		{
			href: '/projets/nouveau',
			icon: FolderPlus,
			title: 'Créer un projet',
			text: 'Un nom et un type suffisent. Aucun groupe n’est nécessaire.'
		},
		{
			href: '/espace/campagnes',
			icon: Music,
			tone: data.outside > 0 ? TONE_OF.works : undefined,
			title: 'Hors projet',
			text: 'Tes morceaux peuvent exister sans projet. Tu peux les rassembler quand tu le souhaites.',
			summary: data.outside > 0 ? plural(data.outside, 'morceau', 'morceaux') : 'Tout est rangé'
		}
	]);
	const closed = [
		{ key: 'done', title: 'Atteints' },
		{ key: 'abandoned', title: 'Laissés de côté' }
	] as const;
</script>

<SEO title="Mes projets" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-5xl space-y-8">
		<MetroPageHeader
			kicker="Collab"
			title="Mes projets"
			intro="Ce que tu prépares, construis et réalises."
		>
			{#snippet actions()}
				<a href="/projets/nouveau" class="lm-btn">Créer un projet</a>
			{/snippet}
		</MetroPageHeader>

		{#if page.url.searchParams.has('supprime')}
			<p role="status" class="text-sm">Projet supprimé. Les morceaux rangés n’ont pas changé.</p>
		{/if}
		{#if page.url.searchParams.has('quitte')}
			<p role="status" class="text-sm">Tu as quitté le projet.</p>
		{/if}
		{#if form?.ok}<p role="status" class="text-sm">{form.ok}</p>{/if}
		{#if form?.error}<p role="alert" class="lm-alert p-3 text-sm">{form.error}</p>{/if}

		{#if data.invitations.length > 0}
			<!-- §9.3 : avant d'accepter, le nom, le type, le porteur, qui invite et ce
			     qui est proposé ; rien des morceaux, de l'équipe ni de la description. -->
			<section id="invitations" aria-labelledby="invitations-titre" class="space-y-3">
				<h2 id="invitations-titre" class="lm-kicker text-muted-foreground">
					Invitations <span>· {data.invitations.length}</span>
				</h2>
				<ul class="grid gap-3 md:grid-cols-2">
					{#each data.invitations as inv (inv.id)}
						<li
							data-tone="paper"
							class="lm-tile lm-tile--flow space-y-3 p-4"
							data-testid="project-invitation"
						>
							<p class="lm-tile__kicker">Projet · {PROJECT_KIND_LABELS[inv.kind]}</p>
							<p class="font-medium">{inv.projectName}</p>
							<p class="text-sm">
								Porté par {inv.owner}{inv.invitedBy ? ` · invitation de ${inv.invitedBy}` : ''}
							</p>
							{#if inv.role}<p class="text-sm">Rôle proposé : {inv.role}</p>{/if}
							<p class="text-sm">
								{#if inv.capabilities.length > 0}
									Proposé : {inv.capabilities.map((c) => CAPABILITY_LABELS[c]).join(', ')}. {PRESETS
										.coordinator.phrase}
								{:else}
									{PRESETS.participant.phrase}
								{/if}
							</p>
							<p class="text-sm text-muted-foreground">
								Si tu acceptes, ton nom figurera dans l’équipe, visible des autres personnes du
								projet.
							</p>
							<div class="flex flex-wrap gap-3">
								<form method="POST" action="?/repondre" use:enhance>
									<input type="hidden" name="participantId" value={inv.id} />
									<input type="hidden" name="answer" value="accept" />
									<button class="lm-btn"
										>Accepter<span class="sr-only"> : {inv.projectName}</span></button
									>
								</form>
								<form method="POST" action="?/repondre" use:enhance>
									<input type="hidden" name="participantId" value={inv.id} />
									<input type="hidden" name="answer" value="decline" />
									<button class="lm-btn" data-variant="ghost"
										>Non merci<span class="sr-only"> : {inv.projectName}</span></button
									>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section aria-labelledby="en-cours" class="space-y-3">
			<h2 id="en-cours" class="lm-kicker text-muted-foreground">
				En cours <span>· {s.active.length}</span>
			</h2>
			{#if s.active.length === 0}
				<MetroEmpty
					icon={FolderOpen}
					text={data.total === 0
						? 'Aucun projet pour l’instant. C’est facultatif : tes morceaux et tes collaborations fonctionnent sans.'
						: 'Aucun projet en cours. Les projets clos restent consultables ci-dessous.'}
					action={{ href: '/projets/nouveau', label: 'Créer un projet' }}
				/>
			{:else}
				<ul class="grid gap-3 md:grid-cols-2" aria-label="Projets en cours">
					{#each s.active as project, i (project.id)}
						<li class="grid"><ProjectTile {project} index={i} /></li>
					{/each}
				</ul>
			{/if}
		</section>

		<MetroMenu items={entries} label="Autour de mes projets" />

		{#each closed as group (group.key)}
			{@const list = s[group.key]}
			{#if list.length > 0}
				<details class="space-y-3">
					<summary class="min-h-11 cursor-pointer py-2 font-medium">
						{group.title} · {list.length}
					</summary>
					<ul class="grid gap-3 md:grid-cols-2" aria-label="Projets {group.title.toLowerCase()}">
						{#each list as project, i (project.id)}
							<li class="grid"><ProjectTile {project} index={i} /></li>
						{/each}
					</ul>
				</details>
			{/if}
		{/each}
	</div>
</div>
