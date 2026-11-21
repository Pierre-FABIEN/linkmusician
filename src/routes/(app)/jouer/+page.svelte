<script lang="ts">
	// LINKMUSICIAN: accueil Metro issu de /_lab/metro : quatre pivots,
	// branchés sur le compte et les parcours réels. Voir docs/design/README.md.
	import SEO from '#lib/components/SEO.svelte';
	import { Award, Beer, Guitar, Megaphone, Rocket, Target, Trophy, Users } from 'lucide-svelte';
	import Aurora from '#lib/components/linkmusician/metro/Aurora.svelte';
	import Panorama from '#lib/components/linkmusician/metro/Panorama.svelte';
	import Pivot from '#lib/components/linkmusician/metro/Pivot.svelte';
	import Tile from '#lib/components/linkmusician/metro/Tile.svelte';
	import { orderedModes } from '#lib/linkmusician/modes';
	import { OPPORTUNITY_KIND_INFO } from '#lib/opportunities/rules';

	let { data, form } = $props();
	const modes = $derived(orderedModes(data.preferredMode));
	const icons = { CAREER: Trophy, JAM: Guitar } as const;
	const fx = { CAREER: 'trophy', JAM: 'notes' } as const;
	const firstName = $derived(data.person.displayName.split(' ')[0]);
	const progress = $derived(data.progress);
	const objective = $derived(progress.objective);
	const date = new Intl.DateTimeFormat('fr-FR', {
		month: 'short',
		weekday: 'long',
		timeZone: 'Europe/Paris'
	});
	const day = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'Europe/Paris' });
	const tones = ['orange', 'rose', 'blue', 'paper'] as const;
</script>

<SEO title="Jouer" noindex nofollow />

{#if form?.error}<p role="alert" class="lm-alert mx-4 p-4">{form.error}</p>{/if}

<Aurora
	intensity="medium"
	speed={1}
	tones={[
		'oklch(0.5 0.25 295)',
		'oklch(0.52 0.23 355)',
		'oklch(0.5 0.2 255)',
		'oklch(0.76 0.17 55)',
		'oklch(0.85 0.16 85)'
	]}
	fade={true}
	class="min-h-screen w-full"
>
	<div class="jouer-home relative z-10 w-full space-y-12 p-4 pb-24 sm:p-8 sm:pb-24">
		<header class="space-y-2">
			<p class="lm-kicker text-muted-foreground">Salut {firstName} !</p>
			<h1 class="lm-display">LinkMusician</h1>
		</header>

		<div class="-mx-4 sm:-mx-8">
			<Panorama label="l'application">
				<Pivot id="jouer" title="jouer">
					<form method="POST" action="?/choose" class="lm-mosaic" aria-label="Choisis ton mode">
						{#each modes as m, i (m.mode)}
							<Tile
								framed
								type="submit"
								name="mode"
								value={m.mode}
								tone={m.mode === 'CAREER' ? 'violet' : 'orange'}
								size="wide"
								icon={icons[m.mode]}
								fx={fx[m.mode]}
								index={i}
								aria-label={m.label}
							>
								<div class="flex items-start justify-between gap-2">
									<p class="lm-tile__kicker">univers</p>
									{#if m.resume}<span class="lm-pill">Reprendre</span>{/if}
								</div>
								<div class="space-y-1">
									<h3 class="lm-tile__title">{m.mode === 'CAREER' ? 'collab' : 'rencontre'}</h3>
									<p class="lm-tile__text">
										{m.mode === 'CAREER'
											? 'Monte un projet : groupe, morceaux, concerts.'
											: 'Joue ce soir, rencontre du monde, sans pression.'}
									</p>
								</div>
							</Tile>
						{/each}
					</form>
					<p class="mt-6 text-sm text-muted-foreground">
						Comment ça marche ?
						<a href="/aide/mode-jam" class="font-semibold underline">Rencontre</a> ·
						<a href="/aide/mode-carriere" class="font-semibold underline">Collab</a>
					</p>
				</Pivot>

				<Pivot id="jam" title="jam">
					<div class="lm-mosaic">
						{#each data.jams as jam, i (jam.id)}
							<Tile
								framed
								tone={i === 0 ? 'orange' : 'cyan'}
								size="md"
								href="/jams/{jam.id}"
								icon={i === 0 ? Beer : undefined}
								fx={i === 0 ? 'cheers' : undefined}
								index={i}
							>
								<p class="lm-figure lm-figure--md">{day.format(new Date(jam.startsAt))}</p>
								<div class="space-y-1">
									<p class="lm-tile__kicker">{date.format(new Date(jam.startsAt))}</p>
									<h3 class="lm-tile__title">{jam.title}</h3>
									<p class="lm-tile__text">
										{jam.venue.name} · {jam.imComing ? 'Tu viens' : 'Voir la jam'}
									</p>
								</div>
							</Tile>
						{:else}
							<Tile
								framed
								tone="orange"
								size="wide"
								href={data.commune ? '/jam/agenda' : '/profil/ville'}
								icon={Guitar}
								fx="notes"
							>
								<p class="lm-tile__kicker">jouer ensemble</p>
								<div class="space-y-1">
									<h3 class="lm-tile__title">
										{data.commune ? 'les jams à venir' : 'indique ta ville'}
									</h3>
									<p class="lm-tile__text">
										{data.commune
											? 'Pas de jam près de toi pour l’instant. Explore les lieux du coin.'
											: 'Pour trouver les jams et les musicien·nes près de toi.'}
									</p>
								</div>
							</Tile>
						{/each}
						{#each data.network as person, i (person.handle)}
							<Tile
								framed
								tone={i === 0 ? 'violet' : 'rose'}
								size={i === 0 ? 'wide' : 'md'}
								href="/@{person.handle}"
								index={2 + i}
							>
								<p class="lm-tile__kicker">
									{person.jamsTogether > 0
										? `${person.jamsTogether} ${person.jamsTogether > 1 ? 'mêmes jams déclarées' : 'même jam déclarée'}`
										: 'dans tes contacts'}
								</p>
								<div class="space-y-1">
									<h3 class="lm-tile__title">{person.displayName}</h3>
									<p class="lm-tile__text">
										{person.instruments.join(' · ') || 'Garder le lien et rejouer ensemble.'}
									</p>
								</div>
							</Tile>
						{:else}
							<Tile framed tone="violet" size="wide" href="/jam/carnet" icon={Users} index={2}>
								<p class="lm-tile__kicker">ton réseau</p>
								<div class="space-y-1">
									<h3 class="lm-tile__title">les musicos croisés</h3>
									<p class="lm-tile__text">
										Tu as croisé quelqu’un en jam ? Retrouve-le dans Découvrir.
									</p>
								</div>
							</Tile>
						{/each}
					</div>
				</Pivot>

				<Pivot id="actualite" title="actualité">
					<div class="lm-mosaic">
						{#each data.opportunities as item, i (item.id)}
							<Tile
								framed
								tone={tones[i]}
								size={i === 0 ? 'tall' : i === 2 ? 'md' : 'wide'}
								href="/annonces/{item.id}"
								icon={i === 0 ? Megaphone : undefined}
								fx={i === 0 ? 'shout' : undefined}
								index={i}
							>
								<p class="lm-tile__kicker">{OPPORTUNITY_KIND_INFO[item.kind].label}</p>
								<div class="space-y-2">
									<h3 class="lm-tile__title">{item.title}</h3>
									<p class="lm-tile__text">{item.issuer}{item.target ? ` · ${item.target}` : ''}</p>
									<span class="lm-pill"
										>{item.distance}{item.commune ? ` · ${item.commune}` : ''}</span
									>
								</div>
							</Tile>
						{:else}
							<Tile
								framed
								tone="orange"
								size="tall"
								href={data.commune ? '/annonces' : '/profil/ville'}
								icon={Megaphone}
								fx="shout"
							>
								<p class="lm-tile__kicker">autour de toi</p>
								<div class="space-y-2">
									<h3 class="lm-tile__title">
										{data.commune ? 'les annonces' : 'choisis ta ville'}
									</h3>
									<p class="lm-tile__text">
										{data.commune
											? 'Aucune annonce près de toi pour l’instant. Tu peux publier ce que tu cherches.'
											: 'Les annonces proches apparaîtront ici.'}
									</p>
								</div>
							</Tile>
						{/each}
						<Tile framed tone="rose" size="wide" href="/decouvrir" index={4}>
							<p class="lm-tile__kicker">rencontrer</p>
							<div class="space-y-1">
								<h3 class="lm-tile__title">des musicien·nes pour toi</h3>
								<p class="lm-tile__text">
									Explore les profils, les styles et les métiers près de chez toi.
								</p>
							</div>
						</Tile>
					</div>
				</Pivot>

				<Pivot id="progres" title="progrès">
					<div class="lm-mosaic">
						<Tile framed tone="ink" size="md" href="/espace/journal" icon={Rocket} fx="rocket">
							<p class="lm-tile__kicker">niveau</p>
							<div class="space-y-2">
								<p class="lm-figure lm-figure--md">{data.level}</p>
								<div
									class="lm-bar"
									role="progressbar"
									aria-label="Progression vers le niveau {data.level + 1}"
									aria-valuemin={0}
									aria-valuemax={progress.xpForNextLevel}
									aria-valuenow={progress.xpIntoLevel}
								>
									<i style:--progress={progress.xpIntoLevel / progress.xpForNextLevel}></i>
								</div>
								<p class="lm-tile__text">{progress.xp.toLocaleString('fr-FR')} XP</p>
							</div>
						</Tile>
						<Tile
							framed
							tone="amber"
							size="md"
							href={objective?.href ?? '/espace/objectifs'}
							icon={Target}
							fx="target"
							index={1}
						>
							<p class="lm-tile__kicker">ta prochaine étape</p>
							<div class="space-y-1">
								<h3 class="lm-tile__title">{objective?.label ?? 'tes objectifs'}</h3>
								<p class="lm-tile__text">
									{objective?.progress
										? `${objective.progress.current} sur ${objective.progress.target}`
										: 'Avance à ton rythme, une étape à la fois.'}
								</p>
							</div>
						</Tile>
						{#each progress.achievements as a, i (a.id)}
							<Tile framed tone="amber" size="sm" href="/espace/progression" index={2 + i}>
								<Award class="size-6" aria-hidden="true" />
								<h3 class="lm-tile__title">{a.name}</h3>
							</Tile>
						{:else}
							<Tile framed tone="paper" size="wide" href="/espace/progression" index={2}>
								<p class="lm-tile__kicker">succès</p>
								<div class="space-y-1">
									<h3 class="lm-tile__title">tes premières réussites</h3>
									<p class="lm-tile__text">
										Retrouve les succès à débloquer et ce qu’ils reconnaissent.
									</p>
								</div>
							</Tile>
						{/each}
					</div>
				</Pivot>
			</Panorama>
		</div>
	</div>
</Aurora>

<style>
	/* Les vrais titres peuvent être plus longs que ceux de la maquette.
	   L'aperçu garde ses proportions ; la fiche liée donne le texte complet. */
	.jouer-home :global(.lm-tile__title),
	.jouer-home :global(.lm-tile__text) {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
	}
	.jouer-home :global(.lm-tile[data-size='md'] .lm-tile__text) {
		-webkit-line-clamp: 1;
		line-clamp: 1;
	}
	.jouer-home :global(.lm-tile .lm-pill) {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
