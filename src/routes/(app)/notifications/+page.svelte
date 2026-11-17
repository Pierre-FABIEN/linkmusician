<script lang="ts">
	// LINKMUSICIAN: notifications (P2-09a), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import {
		Bell,
		CalendarCheck,
		Handshake,
		MessageCircle,
		PartyPopper,
		Guitar,
		ThumbsUp,
		Settings,
		UsersRound,
		UserPlus,
		Music,
		Flag,
		MessagesSquare,
		Mic,
		HandHelping,
		Briefcase
	} from 'lucide-svelte';
	import type { NotificationTypeValue } from '#lib/notifications/types';

	let { data } = $props();

	const ICONS: Record<NotificationTypeValue, typeof Bell> = {
		DELEGATION_REQUEST: Handshake,
		APPLICATION_GRANT: Handshake,
		CONTACT_REQUEST: MessageCircle,
		APPLICATION_RECEIVED: CalendarCheck,
		APPLICATION_ACCEPTED: PartyPopper,
		COLLAB_TO_CONFIRM: Handshake,
		ENDORSEMENT: ThumbsUp,
		JAM_INVITE: Guitar,
		BAND_INVITE: UsersRound,
		BAND_REQUEST: UserPlus,
		BAND_JOINED: UsersRound,
		WORK_CREDIT: Music,
		MILESTONE_ATTEST: Flag,
		GROUP_DISCUSSION_INVITE: MessagesSquare,
		STUDIO_INVITE: Mic,
		ORG_INVITE: CalendarCheck,
		VENUE_HOST_INVITE: Guitar,
		REPRESENTATION_REQUEST: Briefcase,
		VENUE_CLAIM: Flag,
		INTRODUCTION: HandHelping
	};

	const rtf = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });
	const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
	function when(date: Date | string) {
		const minutes = Math.round((new Date(date).getTime() - Date.now()) / 60_000);
		if (minutes > -1) return 'à l’instant';
		if (minutes > -60) return rtf.format(minutes, 'minute');
		if (minutes > -24 * 60) return rtf.format(Math.round(minutes / 60), 'hour');
		if (minutes > -7 * 24 * 60) return rtf.format(Math.round(minutes / (24 * 60)), 'day');
		return dateFormat.format(new Date(date));
	}
	const fresh = $derived(data.notifications.filter((n) => n.unread).length);
</script>

<SEO title="Notifications" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-6xl space-y-6 lg:space-y-8">
		<div class="flex items-center justify-between gap-3">
			<h1 class="lm-title">Notifications</h1>
			<a
				href="/reglages#notifications"
				class="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
			>
				<Settings class="size-4" aria-hidden="true" /> Choisir
			</a>
		</div>
		{#if fresh > 0}
			<p class="text-sm text-muted-foreground">
				{fresh === 1 ? '1 nouveauté' : `${fresh} nouveautés`} depuis ta dernière visite.
			</p>
		{/if}

		{#if data.notifications.length === 0}
			<div class="lm-tile lm-tile--flow p-6 text-center">
				<Bell class="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
				<p class="mt-3 font-semibold">Rien de neuf pour l’instant.</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Les demandes de contact, candidatures, invitations de jam et appréciations arriveront ici.
				</p>
				<a href="/decouvrir" class="mt-4 inline-block text-sm font-medium text-primary underline"
					>Trouver des musicien·nes autour de toi</a
				>
			</div>
		{:else}
			<ul class="grid gap-3 lg:grid-cols-2" aria-label="Notifications">
				{#each data.notifications as n (n.id)}
					{@const Icon = ICONS[n.type]}
					<li>
						<a
							href={n.href}
							class="lm-tile lm-tile--flow flex min-h-16 items-start gap-3 p-3"
							data-tone={n.unread ? 'violet' : undefined}
						>
							<span class="lm-chip rounded-full" data-tone="violet">
								<Icon class="size-5" aria-hidden="true" />
							</span>
							<span class="min-w-0 flex-1">
								<span class="block text-sm {n.unread ? 'font-semibold' : ''}">{n.text}</span>
								<span class="mt-0.5 block text-xs text-muted-foreground">
									{#if n.unread}<span class="sr-only">Nouveau · </span>{/if}{when(n.createdAt)}
								</span>
							</span>
							{#if n.unread}
								<span
									class="lm-fill mt-2 size-2.5 shrink-0 rounded-full"
									data-tone="rose"
									aria-hidden="true"
								></span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
