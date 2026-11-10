<script lang="ts">
	// LINKMUSICIAN: maquette de la direction « Metro » (refonte). Données fictives,
	// aucune page réelle n'est touchée : la direction se valide ici avant de se généraliser.
	import '#lib/linkmusician/theme.css';
	import SEO from '#lib/components/SEO.svelte';
	import Aurora from '#lib/components/linkmusician/metro/Aurora.svelte';
	import Panorama from '#lib/components/linkmusician/metro/Panorama.svelte';
	import Pivot from '#lib/components/linkmusician/metro/Pivot.svelte';
	import Tile from '#lib/components/linkmusician/metro/Tile.svelte';
	import MetroActions from '#lib/components/linkmusician/metro/MetroActions.svelte';
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
	import { distanceBand } from '#lib/geo/distance';
	import {
		Award,
		Beer,
		Check,
		Guitar,
		Lock,
		Megaphone,
		Moon,
		Music,
		Rocket,
		Sun,
		Target,
		Trophy
	} from 'lucide-svelte';
	import { achievements, lea, nearby, quests } from '../data';
	import { mode, setMode } from 'mode-watcher';

	// Le thème du site tourne déjà : la maquette bascule le vrai réglage, pas une copie.
	const dark = $derived(mode.current === 'dark');
	let comes = $state(false);
	let sheet = $state<HTMLDialogElement | null>(null);

	const tones = ['violet', 'rose', 'blue', 'orange', 'amber', 'lime', 'cyan', 'ink'] as const;
	const percent = Math.round((lea.xpIntoLevel / lea.xpForNextLevel) * 100);
	const [malik, volts, ines, tom] = nearby.filter((n) => n.name !== 'Jam du dimanche');
</script>

<SEO title="Metro · maquette" noindex nofollow />

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
	class="lm-metro min-h-screen w-full"
>
	<div class="relative z-10 mx-auto">
		<div class="space-y-12 rounded-3xl p-4 pb-10 sm:p-8 sm:pb-12 w-full">
			<header class="flex flex-wrap items-start justify-between gap-4">
				<div class="space-y-2">
					<p class="lm-kicker text-[color:var(--muted-foreground)]">
						direction visuelle · maquette ·
						<a class="underline" href="/_lab/metro/texte">typographie</a> ·
						<a class="underline" href="/_lab/metro/jam">mode jam</a>
					</p>
					<h1 class="lm-display">LinkMusician</h1>
				</div>
				<!-- Raccourcis en haut à droite, comme l'en-tête de l'app. -->
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
			</header>

			<!-- Panorama : le rail horizontal déborde du cadre, comme l'écran d'accueil d'un Lumia. -->
			<div class="-mx-4 sm:-mx-8">
				<Panorama label="l'application">
					<Pivot id="jouer" title="jouer">
						<div class="lm-mosaic">
							<Tile
								framed
								tone="violet"
								size="wide"
								href="/_lab/metro/carriere"
								icon={Trophy}
								fx="trophy"
								index={0}
							>
								<p class="lm-tile__kicker">mode</p>
								<div class="space-y-1">
									<h3 class="lm-tile__title">carrière</h3>
									<p class="lm-tile__text">Monte un projet : groupe, morceaux, concerts.</p>
								</div>
							</Tile>
							<Tile
								framed
								tone="orange"
								size="wide"
								href="/_lab"
								icon={Guitar}
								fx="notes"
								index={1}
							>
								<p class="lm-tile__kicker">mode</p>
								<div class="space-y-1">
									<h3 class="lm-tile__title">jam</h3>
									<p class="lm-tile__text">Joue ce soir, rencontre du monde, sans pression.</p>
								</div>
							</Tile>
						</div>
					</Pivot>

					<Pivot id="musiciens" title="musiciens">
						<div class="lm-mosaic">
							<Tile framed tone="violet" size="wide" href="/_lab" index={0}>
								<div class="flex items-start justify-between gap-3">
									<p class="lm-tile__kicker">{malik.role}</p>
									<span class="lm-pill">{distanceBand(malik.meters)}</span>
								</div>
								<div class="space-y-1.5">
									<h3 class="lm-tile__title">{malik.name}</h3>
									<p class="lm-tile__text">{malik.genres.join(' · ')} · {malik.commune}</p>
									{#if malik.tier}<TierBadge id={malik.tier.id} label={malik.tier.label} />{/if}
								</div>
							</Tile>
							<Tile framed tone="rose" size="md" href="/_lab" index={1}>
								<p class="lm-tile__kicker">{volts.role}</p>
								<div class="space-y-1">
									<h3 class="lm-tile__title">{volts.name}</h3>
									<p class="lm-tile__text">{volts.genres.join(' · ')}</p>
								</div>
							</Tile>
							<Tile framed tone="cyan" size="md" href="/_lab" index={2}>
								<p class="lm-tile__kicker">{ines.role}</p>
								<div class="space-y-1">
									<h3 class="lm-tile__title">{ines.name}</h3>
									<p class="lm-tile__text">{ines.genres.join(' · ')}</p>
								</div>
							</Tile>
							<Tile framed tone="paper" size="wide" href="/_lab" index={3}>
								<div class="flex items-start justify-between gap-3">
									<p class="lm-tile__kicker">{tom.role}</p>
									<span class="lm-pill">{distanceBand(tom.meters)}</span>
								</div>
								<div class="space-y-1">
									<h3 class="lm-tile__title">{tom.name}</h3>
									<p class="lm-tile__text">{tom.genres.join(' · ')} · {tom.commune}</p>
								</div>
							</Tile>
						</div>
					</Pivot>

					<Pivot id="annonces" title="annonces">
						<div class="lm-mosaic">
							<Tile
								framed
								tone="orange"
								size="tall"
								href="/_lab"
								icon={Megaphone}
								fx="shout"
								index={0}
							>
								<p class="lm-tile__kicker">recrutement</p>
								<div class="space-y-2">
									<h3 class="lm-tile__title">cherche batteur·se funk</h3>
									<p class="lm-tile__text">
										Groupe formé, répète le mardi soir, premiers concerts au printemps.
									</p>
									<span class="lm-pill">{distanceBand(4_500)} · Toulouse</span>
								</div>
							</Tile>
							<Tile framed tone="blue" size="md" href="/_lab" index={1}>
								<p class="lm-tile__kicker">session</p>
								<h3 class="lm-tile__title">studio, samedi</h3>
							</Tile>
							<Tile framed tone="amber" size="md" href="/_lab" index={2}>
								<p class="lm-tile__kicker">jam ouverte</p>
								<h3 class="lm-tile__title">dimanche, 17 h</h3>
							</Tile>
							<Tile framed tone="paper" size="wide" href="/_lab" index={3}>
								<p class="lm-tile__kicker">remplacement</p>
								<div class="space-y-1">
									<h3 class="lm-tile__title">basse, concert samedi</h3>
									<p class="lm-tile__text">Setlist envoyée, deux répètes avant la date.</p>
								</div>
							</Tile>
						</div>
					</Pivot>

					<Pivot id="jam" title="jam">
						<div class="lm-mosaic">
							<Tile
								framed
								tone={comes ? 'lime' : 'orange'}
								size="md"
								aria-pressed={comes}
								onclick={() => (comes = !comes)}
								icon={Beer}
								fx="cheers"
								index={0}
							>
								<div class="flex items-start justify-between gap-2">
									<p class="lm-figure lm-figure--md">14</p>
									{#if comes}<Check class="size-6" aria-hidden="true" />{/if}
								</div>
								<div class="space-y-1">
									<p class="lm-tile__kicker">nov. · jeudi</p>
									<h3 class="lm-tile__title">jazz au comptoir</h3>
									<p class="lm-tile__text">{comes ? 'Tu viens. Retirer ?' : 'Je viens'}</p>
								</div>
							</Tile>
							<Tile framed tone="cyan" size="md" href="/_lab" index={1}>
								<p class="lm-figure lm-figure--md">16</p>
								<div class="space-y-1">
									<p class="lm-tile__kicker">nov. · samedi</p>
									<h3 class="lm-tile__title">scène ouverte du canal</h3>
								</div>
							</Tile>
							<Tile framed tone="ink" size="band" icon={Music} index={2}>
								<p class="lm-tile__kicker">il manque encore</p>
								<div class="flex flex-wrap gap-2">
									<span class="lm-pill">batterie</span><span class="lm-pill">voix</span><span
										class="lm-pill">clavier</span
									>
								</div>
							</Tile>
						</div>
					</Pivot>

					<Pivot id="progres" title="progrès">
						<div class="lm-mosaic">
							<Tile framed tone="ink" size="md" icon={Rocket} fx="rocket" index={0}>
								<p class="lm-tile__kicker">niveau</p>
								<div class="space-y-2">
									<p class="lm-figure lm-figure--md">{lea.level}</p>
									<div
										class="lm-bar"
										role="progressbar"
										aria-label="Progression vers le niveau {lea.level + 1}"
										aria-valuemin={0}
										aria-valuemax={lea.xpForNextLevel}
										aria-valuenow={lea.xpIntoLevel}
									>
										<i style:--progress={percent / 100}></i>
									</div>
									<p class="lm-tile__text">{lea.xp.toLocaleString('fr-FR')} XP</p>
								</div>
							</Tile>
							<Tile framed tone="amber" size="md" href="/_lab" icon={Target} fx="target" index={1}>
								<p class="lm-tile__kicker">ta prochaine étape</p>
								<div class="space-y-1">
									<h3 class="lm-tile__title">{quests[0].label}</h3>
									<p class="lm-tile__text">
										{quests[0].progress?.current} sur {quests[0].progress?.target}
									</p>
								</div>
							</Tile>
							{#each achievements.slice(1, 5) as a, i (a.name)}
								<Tile framed tone={a.unlockedAt ? 'amber' : 'paper'} size="sm" index={2 + i}>
									{#if a.unlockedAt}<Award class="size-6" aria-hidden="true" />{:else}<Lock
											class="size-5"
											aria-hidden="true"
										/><span class="sr-only">(à débloquer)</span>{/if}
									<h3 class="lm-tile__title">{a.name}</h3>
								</Tile>
							{/each}
						</div>
					</Pivot>
				</Panorama>
			</div>

			<!-- Fondations : typographie, couleurs, formulaires, panneau. -->
			<section class="space-y-8" aria-labelledby="fondations">
				<h2 id="fondations" class="lm-title">fondations</h2>

				<div class="grid gap-8 md:grid-cols-2">
					<div class="space-y-3">
						<p class="lm-kicker">typographie</p>
						<p class="lm-display">display</p>
						<p class="lm-title">titre monumental</p>
						<p class="lm-figure">42</p>
						<p class="text-[color:var(--muted-foreground)]">
							Raleway 200 à 300 pour les titres, Open Sans pour le texte et les chiffres. Les
							informations secondaires restent petites, le contraste fait la hiérarchie.
						</p>
					</div>

					<div class="space-y-3">
						<p class="lm-kicker">couleurs</p>
						<div class="lm-mosaic" style:--lm-unit="5.4rem">
							{#each tones as t (t)}
								<Tile framed tone={t} size="sm" index={0}>
									<span></span>
									<h3 class="lm-tile__title">{t}</h3>
								</Tile>
							{/each}
						</div>
					</div>
				</div>

				<div class="grid gap-8 md:grid-cols-2">
					<div class="space-y-3">
						<p class="lm-kicker">boutons et champs</p>
						<div class="flex flex-wrap gap-3">
							<button type="button" class="lm-btn">Enregistrer</button>
							<a class="lm-btn" data-variant="ghost" href="/_lab/metro/jam">Dashboard Jam</a>
							<button type="button" class="lm-btn" data-variant="ghost">Annuler</button>
						</div>
						<div class="space-y-1">
							<label for="lm-demo-field" class="text-sm font-semibold">Ta ville</label>
							<input
								id="lm-demo-field"
								class="lm-field"
								placeholder="Toulouse"
								autocomplete="off"
							/>
						</div>
					</div>

					<div class="space-y-3">
						<p class="lm-kicker">panneau contextuel</p>
						<button type="button" class="lm-btn" onclick={() => sheet?.showModal()}>
							Ouvrir le panneau
						</button>
					</div>
				</div>
			</section>

			<dialog bind:this={sheet} class="lm-sheet" aria-labelledby="lm-sheet-titre">
				<form method="dialog" class="space-y-4">
					<h2 id="lm-sheet-titre" class="lm-title">proposer de jouer</h2>
					<p class="text-[color:var(--muted-foreground)]">
						Une feuille en bas sur mobile, centrée sur grand écran. Échap la ferme et le focus y
						reste.
					</p>
					<div class="flex gap-3">
						<button class="lm-btn" value="ok">Envoyer</button>
						<button class="lm-btn" data-variant="ghost" value="cancel">Fermer</button>
					</div>
				</form>
			</dialog>
		</div>
	</div>
</Aurora>
