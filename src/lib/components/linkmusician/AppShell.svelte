<script lang="ts">
	/**
	 * LINKMUSICIAN: coquille de l'espace connecté (P0-05b, P0-07, P2-12b),
	 * partagée par l'espace `(app)` et les pages publiques vues par un membre
	 * (profil `/@handle`, médias). Ordinateur : onglets en haut. Mobile : bande
	 * du haut et barre d'onglets en bas. Les onglets suivent le **mode de jeu**,
	 * et la pastille du haut ramène au menu `/jouer` pour en changer.
	 */
	import '#lib/linkmusician/theme.css';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { ArrowLeftRight, Guitar, Trophy } from 'lucide-svelte';
	import { NAV_BY_MODE, isActive, modeFor } from '#lib/linkmusician/nav';
	import { PLAY_MODE_INFO, type PlayModeValue } from '#lib/linkmusician/modes';
	import { BRAND } from '#lib/linkmusician/brand';
	import { portal } from '#lib/linkmusician/portal';
	import AccountMenu from './AccountMenu.svelte';

	type ShellUser = { email: string; name?: string | null; username?: string | null; role: string };
	let {
		children,
		user,
		unread = 0,
		preferredMode = null
	}: {
		children: Snippet;
		user: ShellUser | null;
		unread?: number;
		preferredMode?: PlayModeValue | null;
	} = $props();

	const mode = $derived(modeFor(page.url.pathname, preferredMode));
	const nav = $derived(NAV_BY_MODE[mode]);
	const ModeIcon = $derived(mode === 'JAM' ? Guitar : Trophy);

	// Signale la barre d'onglets mobile aux éléments flottants du bas.
	$effect(() => {
		document.body.classList.add('lm-has-tabbar');
		return () => document.body.classList.remove('lm-has-tabbar');
	});
</script>

{#snippet badge(small: boolean)}
	{#if unread > 0}<span
			class={small
				? 'absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-fuchsia-600 px-1 text-center text-[10px] leading-4 font-bold text-white'
				: 'rounded-full bg-fuchsia-600 px-1.5 text-[11px] font-bold text-white'}
			aria-label="{unread} non lu{unread > 1 ? 's' : ''}">{unread}</span
		>{/if}
{/snippet}

<div class="lm-app">
	<header class="w-screen px-4 pt-[max(1rem,env(safe-area-inset-top))] md:pt-6">
		<div class="mx-auto flex max-w-5xl items-center gap-3">
			<a
				href="/jouer"
				class="shrink-0 bg-[image:var(--lm-gradient)] bg-clip-text text-xl font-black text-transparent italic uppercase"
				>{BRAND.name}</a
			>
			<a
				href="/jouer"
				class="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold {mode ===
				'JAM'
					? 'border-orange-400 text-orange-700 dark:text-orange-300'
					: 'border-violet-400 text-violet-700 dark:text-violet-300'}"
				aria-label="{PLAY_MODE_INFO[mode].label} : changer de mode"
			>
				<ModeIcon class="size-3.5" aria-hidden="true" />
				<span class="hidden sm:inline">{PLAY_MODE_INFO[mode].label}</span>
				<ArrowLeftRight class="size-3.5" aria-hidden="true" />
			</a>
			<nav aria-label="Espace" class="hidden min-w-0 flex-1 md:block">
				<ul class="flex gap-1 overflow-x-auto rounded-2xl border bg-card/80 p-1 backdrop-blur">
					{#each nav as item (item.href)}
						{@const active = isActive(item, page.url.pathname)}
						<li class="shrink-0">
							<a
								href={item.href}
								aria-current={active ? 'page' : undefined}
								class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition {active
									? 'bg-primary text-primary-foreground shadow'
									: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
							>
								<item.icon class="size-4" aria-hidden="true" />
								{item.label}
								{#if item.href === '/messages'}{@render badge(false)}{/if}
							</a>
						</li>
					{/each}
				</ul>
			</nav>
			<div class="ml-auto shrink-0">
				<AccountMenu {user} />
			</div>
		</div>
	</header>

	{@render children()}

	<!-- Mobile : barre d'onglets fixe, hors du conteneur de défilement. -->
	<nav
		use:portal
		aria-label="Espace (mobile)"
		class="lm-app fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
	>
		<ul
			class="mx-auto grid max-w-md"
			style:grid-template-columns="repeat({nav.length}, minmax(0, 1fr))"
		>
			{#each nav as item (item.href)}
				{@const active = isActive(item, page.url.pathname)}
				<li>
					<a
						href={item.href}
						aria-current={active ? 'page' : undefined}
						class="flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium {active
							? 'text-primary'
							: 'text-muted-foreground'}"
					>
						<span class="relative">
							<item.icon class="size-5" aria-hidden="true" />
							{#if item.href === '/messages'}{@render badge(true)}{/if}
						</span>
						<span class="max-w-full truncate">{item.label}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>
</div>
