<script lang="ts">
	/**
	 * LINKMUSICIAN: coquille de l'espace connecté (P0-05b, P0-07, P2-12b),
	 * partagée par l'espace `(app)` et les pages publiques vues par un membre
	 * (profil `/@handle`, médias, aide, démarches). En Metro depuis MET-01
	 * (D55) : toutes les pages qu'elle porte prennent le papier, l'encre et la
	 * matière Metro. Les raccourcis (`MetroActions`) sont à droite ; la
	 * pastille du mode bascule directement entre carrière et jam ; les
	 * pastilles sont actualisées périodiquement.
	 */
	import '#lib/linkmusician/theme.css';
	import type { Snippet } from 'svelte';
	import { page, navigating } from '$app/state';
	import { enhance } from '$app/forms';
	import { mode as colorMode, toggleMode as toggleColorMode } from 'mode-watcher';
	import { ArrowLeftRight, Guitar, Megaphone, Trophy, Sun, Moon } from 'lucide-svelte';
	import MetroActions from './metro/MetroActions.svelte';
	import { toneOfMode } from './metro/tones';
	import { modeFor, PLAY_MODE_INFO, type PlayModeValue } from '#lib/linkmusician/modes';
	import { breadcrumbs } from '#lib/linkmusician/breadcrumbs';
	import Breadcrumbs from './Breadcrumbs.svelte';
	import type { NavigationContext } from '#lib/linkmusician/navigation';
	import { BRAND } from '#lib/linkmusician/brand';
	import AccountMenu from './AccountMenu.svelte';

	type ShellUser = { email: string; name?: string | null; username?: string | null; role: string };
	let {
		children,
		user,
		unread = 0,
		notifications = 0,
		preferredMode = null,
		navigation = null
	}: {
		children: Snippet;
		user: ShellUser | null;
		unread?: number;
		notifications?: number;
		preferredMode?: PlayModeValue | null;
		navigation?: NavigationContext | null;
	} = $props();

	/** Pastilles relues après le chargement (`/api/notifications/badge`). */
	let live = $state<{ notifications: number; messages: number } | null>(null);
	const messages = $derived(live?.messages ?? unread);
	const bell = $derived(live?.notifications ?? notifications);

	async function refreshBadges() {
		try {
			const res = await fetch('/api/notifications/badge', { cache: 'no-store' });
			if (res.ok) live = await res.json();
		} catch {
			// Hors ligne : on garde les dernières valeurs.
		}
	}

	// À chaque navigation (la page des notifications vient de tout lire)…
	$effect(() => {
		void page.url.pathname;
		refreshBadges();
	});
	// … et toutes les 60 s, seulement quand l'onglet est visible.
	$effect(() => {
		const timer = setInterval(() => {
			if (document.visibilityState === 'visible') refreshBadges();
		}, 60_000);
		const onVisible = () => {
			if (document.visibilityState === 'visible') refreshBadges();
		};
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});

	let switchingTrack = $state(false);
	const mode = $derived(modeFor(page.url.pathname, preferredMode));
	// Fil d'Ariane (D52), sur toutes les pages de la coquille.
	const crumbs = $derived(
		breadcrumbs({
			routeId: page.route.id,
			pathname: page.url.pathname,
			params: page.params as Record<string, string>,
			data: page.data as Record<string, unknown>,
			preferredMode
		})
	);
	const targetMode = $derived(mode === 'JAM' ? 'CAREER' : 'JAM');
	const ModeIcon = $derived(mode === 'JAM' ? Guitar : Trophy);
	const showGroupAnnouncements = $derived(page.url.pathname === '/groupes');
	const path = $derived(page.url.pathname);
	const current = $derived(
		path.startsWith('/decouvrir')
			? 'discover'
			: path.startsWith('/messages')
				? 'messages'
				: path === '/notifications'
					? 'notifications'
					: path.startsWith('/aide')
						? 'help'
						: null
	);
</script>

<div class="lm-app lm-metro">
	<header class="lm-shell-header w-full">
		<div class="mx-auto flex max-w-7xl items-center gap-2 md:gap-3">
			<a
				href="/jouer"
				aria-label={BRAND.name}
				class="lm-shell-brand shrink-0 {showGroupAnnouncements
					? 'max-[519px]:hidden'
					: 'max-[419px]:hidden'}">{BRAND.name}</a
			>
			<form method="POST" action="/jouer?/toggleMode">
				<input type="hidden" name="mode" value={targetMode} />
				<button
					type="submit"
					class="lm-mode-pill shrink-0"
					data-tone={toneOfMode(mode)}
					aria-label="Passer à {PLAY_MODE_INFO[targetMode].label}"
					title="Passer à {PLAY_MODE_INFO[targetMode].label}"
				>
					<ModeIcon class="size-4" aria-hidden="true" />
					<span class="hidden sm:inline">{PLAY_MODE_INFO[mode].label}</span>
					<ArrowLeftRight class="size-3.5" aria-hidden="true" />
				</button>
			</form>
			{#if showGroupAnnouncements}
				<a
					href="/annonces"
					class="lm-action shrink-0"
					aria-label="Annonces"
					title="Voir les annonces"
				>
					<Megaphone class="size-5" aria-hidden="true" />
				</a>
			{/if}
			<div class="ml-auto flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
				{#if navigation && navigation.tracks.length > 1}
					<form
						method="POST"
						action="/jouer?/switchTrack"
						class="min-w-0 max-w-full"
						use:enhance={() => {
							switchingTrack = true;
							return async ({ update }) => {
								try {
									await update();
								} finally {
									switchingTrack = false;
								}
							};
						}}
					>
						<input
							type="hidden"
							name="returnTo"
							value={page.url.pathname + page.url.search + page.url.hash}
						/>
						<label for="active-track" class="sr-only">Rôle</label>
						<select
							id="active-track"
							name="track"
							class="lm-role-select"
							value={navigation.active}
							disabled={switchingTrack || Boolean(navigating.to)}
							onchange={(event) => event.currentTarget.form?.requestSubmit()}
						>
							{#each navigation.tracks as track (track.track)}
								<option value={track.track}
									>Rôle : {track.label}{track.available ? '' : ' · bientôt'}</option
								>
							{/each}
						</select>
						<noscript><button type="submit" class="lm-btn">Changer de rôle</button></noscript>
					</form>
				{/if}
				<MetroActions {messages} notifications={bell} {current} />
				<button
					type="button"
					class="lm-action shrink-0"
					onclick={toggleColorMode}
					aria-label={colorMode.current === 'dark'
						? 'Passer au mode clair'
						: 'Passer au mode sombre'}
					title={colorMode.current === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre'}
				>
					{#if colorMode.current === 'dark'}<Sun class="size-5" aria-hidden="true" />{:else}<Moon
							class="size-5"
							aria-hidden="true"
						/>{/if}
				</button>
				<AccountMenu {user} />
			</div>
		</div>
	</header>

	<Breadcrumbs {crumbs} />
	{@render children()}
</div>
