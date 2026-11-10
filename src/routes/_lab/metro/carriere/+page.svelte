<script lang="ts">
	import MetroActions from '#lib/components/linkmusician/metro/MetroActions.svelte';
	import '#lib/linkmusician/theme.css';
	import SEO from '#lib/components/SEO.svelte';
	import Aurora from '#lib/components/linkmusician/metro/Aurora.svelte';
	import Tile from '#lib/components/linkmusician/metro/Tile.svelte';
	import { careerMap } from '#lib/career/map';
	import { achievements, gains, lea, quests } from '../../data';
	import {
		ArrowLeft,
		ArrowRight,
		Award,
		CalendarDays,
		Check,
		CircleCheck,
		Disc3,
		Guitar,
		Lock,
		Moon,
		Sun,
		Trophy,
		UsersRound
	} from 'lucide-svelte';
	import { mode, setMode } from 'mode-watcher';

	const dark = $derived(mode.current === 'dark');
	const dashboard = careerMap(
		{ jamAppreciations: 1, collaborations: 3, worksTogether: 1, worksSolo: 1, recordings: 0 },
		'RECORD'
	);
	const currentAct = dashboard.acts.find((act) => act.status === 'current')!;
	const percent = Math.round((lea.xpIntoLevel / lea.xpForNextLevel) * 100);
	const currentQuest = quests[0];
</script>

<SEO title="Carrière Metro · maquette" noindex nofollow />

<Aurora
	intensity="medium"
	speed={1}
	tones={[
		'oklch(0.5 0.25 295)',
		'oklch(0.52 0.23 355)',
		'oklch(0.5 0.2 255)',
		'oklch(0.76 0.17 55)'
	]}
	fade={true}
	class="lm-metro min-h-screen w-full"
>
	<main class="relative z-10 mx-auto w-full max-w-none px-5 pt-5 pb-24 sm:px-8 2xl:px-10">
		<nav class="flex flex-wrap items-center justify-between gap-3" aria-label="Navigation Metro">
			<a class="lm-btn" data-variant="ghost" href="/_lab/metro">
				<ArrowLeft class="size-4" aria-hidden="true" />
				<span>Metro</span>
			</a>
			<div class="lm-career-nav-actions flex flex-wrap items-center justify-end gap-2">
				<a class="lm-btn" data-variant="ghost" href="/_lab/metro/jam">Mode Jam</a>
				<div class="flex items-center gap-2">
					<MetroActions
						messages={3}
						notifications={1}
						hrefs={{ discover: '/_lab', messages: '/_lab', notifications: '/_lab', help: '/_lab' }}
					/>
					<button
						type="button"
						class="lm-action"
						aria-pressed={dark}
						title={dark ? 'Mode clair' : 'Mode sombre'}
						onclick={() => setMode(dark ? 'light' : 'dark')}
					>
						{#if dark}<Sun class="size-5" aria-hidden="true" />{:else}<Moon
								class="size-5"
								aria-hidden="true"
							/>{/if}
						<span class="sr-only">{dark ? 'Mode clair' : 'Mode sombre'}</span>
					</button>
				</div>
			</div>
		</nav>

		<div class="lm-career-board-wrap mt-6">
			<div class="lm-career-board" aria-label="Tableau de bord du mode Carrière">
				<Tile tone="orange" size="big" class="lm-pattern-tile lm-career-next">
					<div class="space-y-3">
						<p class="lm-tile__kicker">
							<Guitar class="mr-1 inline size-4" aria-hidden="true" />Carrière · {lea.commune}
						</p>
						<h1 class="lm-pattern-title lm-pattern-title--display">Salut {lea.displayName}.</h1>
						<p class="lm-pattern-copy">
							Ton projet avance avec les personnes qui jouent et créent avec toi.
						</p>
					</div>
					<div class="space-y-3">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<p class="lm-tile__text">Niveau {lea.level} · {lea.xp.toLocaleString('fr-FR')} XP</p>
							<span class="lm-pill">{lea.tier.label}</span>
						</div>
						<div
							class="lm-bar"
							role="progressbar"
							aria-label="Progression vers le niveau {lea.level + 1}"
							aria-valuemin="0"
							aria-valuemax={lea.xpForNextLevel}
							aria-valuenow={lea.xpIntoLevel}
						>
							<i style:--progress={percent / 100}></i>
						</div>
						<div class="flex flex-wrap items-center justify-between gap-3">
							<p class="lm-tile__text">Acte {currentAct.roman} · {currentAct.name}</p>
							<a class="lm-btn" href="#career-objective">
								Prochaine étape <ArrowRight class="size-4" aria-hidden="true" />
							</a>
						</div>
					</div>
				</Tile>

				<Tile tone="violet" size="wide" class="lm-pattern-tile lm-career-map">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="lm-tile__kicker">Carte de carrière · ambition studio</p>
							<h2 class="lm-pattern-title">Huit actes, un parcours à toi.</h2>
						</div>
						<span class="lm-pill">{dashboard.passed.length} actes franchis</span>
					</div>
					<ol class="lm-career-acts" aria-label="Actes de carrière">
						{#each dashboard.acts as act (act.number)}
							<li class="lm-career-act" data-status={act.status}>
								<span class="lm-career-act__number">
									{#if act.status === 'passed'}<Check
											class="size-4"
											aria-hidden="true"
										/>{:else if act.status === 'fog'}<Lock
											class="size-3.5"
											aria-hidden="true"
										/>{:else}{act.roman}{/if}
								</span>
								<span class="lm-career-act__name">{act.name}</span>
								{#if act.status === 'current'}<span class="sr-only">Acte en cours</span>{/if}
							</li>
						{/each}
					</ol>
					<a class="lm-pattern-action" href="/_lab/metro">
						Explorer ma carte <ArrowRight class="size-4" aria-hidden="true" />
					</a>
				</Tile>

				<Tile
					id="career-objective"
					tone="amber"
					size="md"
					class="lm-pattern-tile lm-career-objective"
				>
					<div class="flex items-start justify-between gap-3">
						<p class="lm-tile__kicker">Ta prochaine étape</p>
						<Trophy class="size-5" aria-hidden="true" />
					</div>
					<div class="space-y-2">
						<h2 class="lm-pattern-title lm-pattern-title--large">{currentQuest.label}</h2>
						<p class="lm-tile__text">
							{currentQuest.progress?.current} sur {currentQuest.progress?.target} concerts
						</p>
					</div>
					<a class="lm-pattern-action" href="/_lab/metro">
						Voir mes objectifs <ArrowRight class="size-4" aria-hidden="true" />
					</a>
				</Tile>

				<Tile tone="cyan" size="wide" class="lm-pattern-tile lm-career-campaign">
					<div class="flex items-start justify-between gap-3">
						<p class="lm-tile__kicker">Campagne en cours · morceau</p>
						<Disc3 class="size-6" aria-hidden="true" />
					</div>
					<div class="space-y-2">
						<h2 class="lm-pattern-title lm-pattern-title--large">« À contretemps »</h2>
						<p class="lm-pattern-copy">Composition collective · démo à enregistrer · 3 personnes</p>
					</div>
					<div class="flex flex-wrap gap-2">
						<span class="lm-pill">Basse · Léa</span>
						<span class="lm-pill">Voix · Inès</span>
						<span class="lm-pill">Clavier à trouver</span>
					</div>
					<a class="lm-pattern-action" href="/_lab/metro">
						Ouvrir la campagne <ArrowRight class="size-4" aria-hidden="true" />
					</a>
				</Tile>

				<Tile tone="lime" size="md" class="lm-pattern-tile lm-career-team">
					<div class="flex items-start justify-between gap-3">
						<p class="lm-tile__kicker">Mon équipe</p>
						<UsersRound class="size-5" aria-hidden="true" />
					</div>
					<div class="space-y-2">
						<h2 class="lm-pattern-title lm-pattern-title--large">Les Volts</h2>
						<p class="lm-tile__text">4 musicien·nes · répétition mardi</p>
					</div>
					<a class="lm-pattern-action" href="/_lab/metro">
						Voir le groupe <ArrowRight class="size-4" aria-hidden="true" />
					</a>
				</Tile>

				<Tile tone="rose" size="md" class="lm-pattern-tile lm-career-agenda">
					<div class="flex items-start justify-between gap-3">
						<p class="lm-tile__kicker">À venir · agenda</p>
						<CalendarDays class="size-5" aria-hidden="true" />
					</div>
					<div class="space-y-3">
						<div>
							<p class="lm-tile__text">12 nov. · 19 h</p>
							<h2 class="lm-pattern-title">Répétition</h2>
						</div>
						<div>
							<p class="lm-tile__text">21 nov. · 20 h</p>
							<h3 class="lm-tile__title">Concert au Bijou</h3>
						</div>
					</div>
					<a class="lm-pattern-action" href="/_lab/metro">
						Ouvrir l’agenda <ArrowRight class="size-4" aria-hidden="true" />
					</a>
				</Tile>

				<Tile tone="ink" size="wide" class="lm-pattern-tile lm-career-journal">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="lm-tile__kicker">Journal de bord</p>
							<h2 class="lm-pattern-title">Les dernières étapes qui comptent.</h2>
						</div>
						<Award class="size-6" aria-hidden="true" />
					</div>
					<ul class="lm-career-gains" aria-label="Derniers gains de progression">
						{#each gains.slice(0, 3) as gain (gain.reason)}
							<li>
								<span><CircleCheck class="size-4" aria-hidden="true" />{gain.reason}</span>
								<strong>+{gain.xp} XP</strong>
								<time>{gain.date}</time>
							</li>
						{/each}
					</ul>
					<div class="flex items-center justify-between gap-3">
						<span class="lm-pill"
							>{achievements.filter((item) => item.unlockedAt).length} succès débloqués</span
						>
						<a class="lm-pattern-action" href="/_lab/metro">
							Voir la progression <ArrowRight class="size-4" aria-hidden="true" />
						</a>
					</div>
				</Tile>
			</div>
		</div>
	</main>
</Aurora>
