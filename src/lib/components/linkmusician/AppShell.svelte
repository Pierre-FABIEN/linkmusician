<script lang="ts">
	/**
	 * LINKMUSICIAN: coquille de l'espace connecté (P0-05b, P0-07, P2-12b),
	 * partagée par l'espace `(app)` et les pages publiques vues par un membre
	 * (profil `/@handle`, médias). Les icônes Découvrir, Messages et
	 * Notifications sont à droite. La pastille du mode bascule directement
	 * entre carrière et jam ; les badges sont actualisés périodiquement.
	 */
	import '#lib/linkmusician/theme.css';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import {
		ArrowLeftRight,
		Bell,
		Compass,
		Guitar,
		Megaphone,
		MessageCircle,
		Trophy
	} from 'lucide-svelte';
	import { badgeLabel } from '#lib/notifications/types';
	import { modeFor, PLAY_MODE_INFO, type PlayModeValue } from '#lib/linkmusician/modes';
	import { BRAND } from '#lib/linkmusician/brand';
	import AccountMenu from './AccountMenu.svelte';

	type ShellUser = { email: string; name?: string | null; username?: string | null; role: string };
	let {
		children,
		user,
		unread = 0,
		notifications = 0,
		preferredMode = null
	}: {
		children: Snippet;
		user: ShellUser | null;
		unread?: number;
		notifications?: number;
		preferredMode?: PlayModeValue | null;
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

	const mode = $derived(modeFor(page.url.pathname, preferredMode));
	const targetMode = $derived(mode === 'JAM' ? 'CAREER' : 'JAM');
	const ModeIcon = $derived(mode === 'JAM' ? Guitar : Trophy);
	const showGroupAnnouncements = $derived(page.url.pathname === '/groupes');
</script>

{#snippet badge()}
	{#if messages > 0}<span
			class="absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-fuchsia-600 px-1 text-center text-[10px] leading-4 font-bold text-white"
			aria-label="{messages} non lu{messages > 1 ? 's' : ''}">{badgeLabel(messages)}</span
		>{/if}
{/snippet}

<div class="lm-app">
	<header class="w-full px-4 pt-[max(1rem,env(safe-area-inset-top))] md:pt-6">
		<div class="mx-auto flex max-w-7xl items-center gap-2 md:gap-3">
			<a
				href="/jouer"
				aria-label={BRAND.name}
				class="shrink-0 bg-[image:var(--lm-gradient)] bg-clip-text text-lg font-black text-transparent italic uppercase {showGroupAnnouncements
					? 'max-[479px]:hidden'
					: 'max-[359px]:hidden'} sm:text-xl">{BRAND.name}</a
			>
			<form method="POST" action="/jouer?/toggleMode">
				<input type="hidden" name="mode" value={targetMode} />
				<button
					type="submit"
					class="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border px-2 text-xs font-semibold sm:gap-1.5 sm:px-3 {mode ===
					'JAM'
						? 'border-orange-400 text-orange-700 dark:text-orange-300'
						: 'border-violet-400 text-violet-700 dark:text-violet-300'}"
					aria-label="Passer au {PLAY_MODE_INFO[targetMode].label}"
					title="Passer au {PLAY_MODE_INFO[targetMode].label}"
				>
					<ModeIcon class="size-3.5" aria-hidden="true" />
					<span class="hidden sm:inline">{PLAY_MODE_INFO[mode].label}</span>
					<ArrowLeftRight class="size-3.5" aria-hidden="true" />
				</button>
			</form>
			{#if showGroupAnnouncements}
				<a
					href="/annonces"
					class="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-2 text-sm text-muted-foreground underline-offset-4 transition hover:bg-muted hover:text-foreground hover:underline sm:gap-1.5 sm:px-3"
					aria-label="Annonces"
					title="Voir les annonces"
				>
					<Megaphone class="size-4" aria-hidden="true" />
					<span class="hidden sm:inline">Annonces</span>
				</a>
			{/if}
			<div class="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
				<a
					href="/decouvrir"
					class="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground sm:size-11"
					aria-current={page.url.pathname.startsWith('/decouvrir') ? 'page' : undefined}
					aria-label="Découvrir"
				>
					<Compass class="size-5" aria-hidden="true" />
				</a>
				<a
					href="/messages"
					class="relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground sm:size-11"
					aria-current={page.url.pathname.startsWith('/messages') ? 'page' : undefined}
					aria-label={messages > 0
						? `Messages : ${messages} non lu${messages > 1 ? 's' : ''}`
						: 'Messages'}
				>
					<MessageCircle class="size-5" aria-hidden="true" />
					{@render badge()}
				</a>
				<a
					href="/notifications"
					class="relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground sm:size-11"
					aria-current={page.url.pathname === '/notifications' ? 'page' : undefined}
					aria-label={bell > 0
						? `Notifications : ${bell} nouvelle${bell > 1 ? 's' : ''}`
						: 'Notifications'}
				>
					<Bell class="size-5" aria-hidden="true" />
					{#if bell > 0}<span
							class="absolute top-1.5 right-1 min-w-4 rounded-full bg-fuchsia-600 px-1 text-center text-[10px] leading-4 font-bold text-white"
							aria-hidden="true">{badgeLabel(bell)}</span
						>{/if}
				</a>
				<AccountMenu {user} />
			</div>
		</div>
	</header>

	{@render children()}
</div>
