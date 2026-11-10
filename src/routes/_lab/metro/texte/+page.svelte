<script lang="ts">
	import '#lib/linkmusician/theme.css';
	import SEO from '#lib/components/SEO.svelte';
	import Aurora from '#lib/components/linkmusician/metro/Aurora.svelte';
	import Tile from '#lib/components/linkmusician/metro/Tile.svelte';
	import ActionTile from '#lib/components/linkmusician/metro/ActionTile.svelte';
	import EventTile from '#lib/components/linkmusician/metro/EventTile.svelte';
	import ProfileTile from '#lib/components/linkmusician/metro/ProfileTile.svelte';
	import {
		ArrowLeft,
		ArrowRight,
		Bell,
		Check,
		Moon,
		Music2,
		Plus,
		Search,
		Sparkles,
		Sun
	} from 'lucide-svelte';
	import { mode, setMode } from 'mode-watcher';

	const dark = $derived(mode.current === 'dark');
	let savedJam = $state(false);
	let searchCity = $state('Toulouse');
	let searchSubmitted = $state(false);
</script>

<SEO title="Composants Metro · maquette" noindex nofollow />

<Aurora
	intensity="subtle"
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
	<main class="relative z-10 mx-auto max-w-[88rem] px-5 pt-5 pb-24 sm:px-10 lg:px-16">
		<nav class="flex items-center justify-between gap-4" aria-label="Navigation Metro">
			<a class="lm-btn" data-variant="ghost" href="/_lab/metro">
				<ArrowLeft class="size-4" aria-hidden="true" />
				<span>Metro</span>
			</a>
			<button
				type="button"
				class="lm-btn"
				data-variant="ghost"
				aria-pressed={dark}
				onclick={() => setMode(dark ? 'light' : 'dark')}
			>
				{#if dark}<Sun class="size-4" aria-hidden="true" />{:else}<Moon
						class="size-4"
						aria-hidden="true"
					/>{/if}
				<span>{dark ? 'Mode clair' : 'Mode sombre'}</span>
			</button>
		</nav>

		<div class="lm-pattern-board-wrap mt-6">
			<div class="lm-pattern-board" aria-label="Exemples de composants de l’application Metro">
				<Tile tone="ink" size="wide" class="lm-pattern-tile lm-pattern-tile--intro">
					<p class="lm-tile__kicker">Composants Metro · LINKMUSICIAN</p>
					<div class="space-y-3">
						<h1 class="lm-pattern-title lm-pattern-title--display">
							Tout commence par une rencontre.
						</h1>
						<p class="lm-pattern-copy">
							Profils, annonces, jams, progression et actions : chaque contenu a sa tuile, sa taille
							et son niveau d’importance.
						</p>
					</div>
					<a class="lm-pattern-action" href="/_lab/metro"
						>Voir la maquette Metro <ArrowRight class="size-4" aria-hidden="true" /></a
					>
				</Tile>

				<ProfileTile
					href="/_lab/metro"
					initials="MB"
					name="Malik B."
					instrument="Batterie · confirmé"
					genres={['Funk', 'Hip-hop']}
					location="Toulouse"
					distance="à moins de 5 km"
				/>

				<EventTile
					month="nov."
					day="14"
					time="jeudi · 20 h 30"
					title="Jazz au comptoir"
					description="Jam ouverte, scène accueillante. Viens avec ton instrument ou simplement écouter."
					place="Toulouse"
					attendees="8 participant·es"
					availability="3 places recherchées"
					joined={savedJam}
					onJoin={() => (savedJam = !savedJam)}
				/>

				<Tile tone="amber" size="md" class="lm-pattern-tile lm-pattern-tile--announcement">
					<p class="lm-tile__kicker">Annonce · recrutement</p>
					<div class="space-y-3">
						<h2 class="lm-pattern-title lm-pattern-title--large">
							Une basse pour notre projet soul.
						</h2>
						<p class="lm-pattern-copy">
							On cherche une personne régulière pour écrire et répéter le week-end.
						</p>
					</div>
					<div class="flex flex-wrap gap-2">
						<span class="lm-pill">Soul</span><span class="lm-pill">Répétition</span><span
							class="lm-pill">Débutant·e bienvenu·e</span
						>
					</div>
					<a class="lm-pattern-action" href="/_lab/metro"
						>Répondre à l’annonce <ArrowRight class="size-4" aria-hidden="true" /></a
					>
				</Tile>

				<Tile tone="cyan" size="md" class="lm-pattern-tile">
					<p class="lm-tile__kicker">Recherche · filtre rapide</p>
					<div class="space-y-2">
						<h2 class="lm-pattern-title">Qui joue près de toi ?</h2>
						<p class="lm-tile__text">Ville et instrument suffisent pour commencer.</p>
					</div>
					<form
						class="space-y-3"
						onsubmit={(event) => {
							event.preventDefault();
							searchSubmitted = true;
						}}
					>
						<label class="lm-pattern-field-label" for="metro-city">Ta ville</label>
						<input id="metro-city" class="lm-field" bind:value={searchCity} />
						<button class="lm-btn" type="submit"
							><Search class="size-4" aria-hidden="true" />Rechercher</button
						>
						{#if searchSubmitted}<p class="lm-tile__text" role="status">
								3 profils autour de {searchCity || 'toi'}.
							</p>{/if}
					</form>
				</Tile>

				<Tile tone="violet" size="md" class="lm-pattern-tile">
					<div class="flex items-start justify-between gap-3">
						<p class="lm-tile__kicker">Progression · niveau 6</p>
						<Sparkles class="size-5" aria-hidden="true" />
					</div>
					<div class="space-y-2">
						<p class="lm-pattern-number">1 565 <span>XP</span></p>
						<p class="lm-pattern-copy">Encore 435 XP avant le niveau 7.</p>
					</div>
					<div class="space-y-2">
						<div
							class="lm-bar"
							role="progressbar"
							aria-label="Progression vers le niveau 7"
							aria-valuemin="0"
							aria-valuemax="2000"
							aria-valuenow="1565"
						>
							<i style="--v:78.25%"></i>
						</div>
						<p class="lm-tile__text">1 565 / 2 000 XP</p>
					</div>
					<a class="lm-pattern-action" href="/_lab/metro"
						>Voir mes étapes <ArrowRight class="size-4" aria-hidden="true" /></a
					>
				</Tile>

				<Tile tone="rose" size="md" class="lm-pattern-tile">
					<p class="lm-tile__kicker">Statistique · ce mois-ci</p>
					<div>
						<p class="lm-pattern-number">12</p>
						<h2 class="lm-pattern-title">rencontres musicales</h2>
					</div>
					<p class="lm-tile__text">+4 depuis le mois dernier</p>
				</Tile>

				<Tile tone="paper" size="md" class="lm-pattern-tile">
					<div class="flex items-center justify-between gap-3">
						<p class="lm-tile__kicker">Notification</p>
						<span class="lm-pattern-unread" aria-label="Non lu"></span>
					</div>
					<div class="space-y-2">
						<div class="lm-pattern-icon"><Bell class="size-5" aria-hidden="true" /></div>
						<h2 class="lm-pattern-title">Inès t’a écrit.</h2>
						<p class="lm-tile__text">« On se cale une répète samedi ? »</p>
					</div>
					<p class="lm-tile__text">Il y a 12 min</p>
				</Tile>

				<Tile tone="ink" size="wide" class="lm-pattern-tile">
					<p class="lm-tile__kicker">Témoignage · première collaboration</p>
					<div class="lm-pattern-quote">
						<span aria-hidden="true">“</span>
						<blockquote>
							On a commencé par une reprise, puis on a écrit quelque chose qui nous ressemblait.
						</blockquote>
					</div>
					<div class="flex items-center gap-3">
						<div class="lm-pattern-avatar lm-pattern-avatar--small" aria-hidden="true">L</div>
						<p class="lm-tile__text">Léa · musicienne à Toulouse</p>
					</div>
				</Tile>

				<Tile tone="blue" size="md" class="lm-pattern-tile lm-pattern-tile--empty">
					<p class="lm-tile__kicker">État vide · carnet</p>
					<div class="space-y-3">
						<div class="lm-pattern-icon"><Music2 class="size-6" aria-hidden="true" /></div>
						<h2 class="lm-pattern-title">Le prochain morceau reste à écrire.</h2>
						<p class="lm-pattern-copy">
							Ajoute un premier morceau pour garder vos idées et faire avancer le projet.
						</p>
					</div>
					<button class="lm-btn" type="button"
						><Plus class="size-4" aria-hidden="true" />Ajouter un morceau</button
					>
				</Tile>

				<Tile tone="lime" size="md" class="lm-pattern-tile">
					<p class="lm-tile__kicker">Confirmation · collaboration</p>
					<div class="space-y-3">
						<div class="lm-pattern-icon"><Check class="size-6" aria-hidden="true" /></div>
						<h2 class="lm-pattern-title">Tu as rejoint cette jam.</h2>
						<p class="lm-pattern-copy">
							Les détails du rendez-vous et les participant·es sont prêts.
						</p>
					</div>
					<a class="lm-pattern-action" href="/_lab/metro"
						>Ouvrir le rendez-vous <ArrowRight class="size-4" aria-hidden="true" /></a
					>
				</Tile>

				<ActionTile
					eyebrow="À toi de jouer"
					title="Rencontre les musicien·nes de ta scène."
					detail="Explore les profils et trouve les personnes qui partagent tes envies."
					actionLabel="Découvrir les profils"
					href="/_lab/metro"
				/>
			</div>
		</div>
	</main>
</Aurora>
