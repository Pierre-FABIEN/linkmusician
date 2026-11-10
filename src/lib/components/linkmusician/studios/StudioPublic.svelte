<script lang="ts">
	// LINKMUSICIAN: page publique d'un studio `/@handle` (P4-03a), même
	// structure que celle d'un groupe. Données : `getPublicStudio`. Jamais
	// d'adresse : la ville seulement.
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import StructuredData from '#lib/components/StructuredData.svelte';
	import * as Card from '#shadcn/card';
	import * as Avatar from '#shadcn/avatar';
	import { BadgeCheck, CalendarClock, Mic, MapPin, Wrench } from 'lucide-svelte';
	import { initialsOf } from '#lib/actors/display';
	import { REPORT_REASONS, REPORT_REASON_LABELS, MAX_REPORT_DETAILS } from '#lib/moderation/rules';
	import { seoConfig } from '#lib/seo.config';
	import { displayTime, STUDIO_SERVICE_INFO, WEEKDAY_LABELS } from '#lib/studios/rules';
	import type { PublicStudio } from '#lib/server/studios/service';
	import TierBadge from '../progress/TierBadge.svelte';

	let {
		studio,
		canReport,
		memberShell
	}: { studio: Omit<PublicStudio, 'id'>; canReport: boolean; memberShell: boolean } = $props();

	const services = $derived(studio.services.map((s) => STUDIO_SERVICE_INFO[s].label));
	const description = $derived(
		(
			studio.bio?.trim() ||
			`${studio.name}, studio${studio.commune ? ` à ${studio.commune}` : ''} : ${services.join(', ').toLowerCase()}.`
		).slice(0, 160)
	);
	const url = $derived(`${seoConfig.site.url}/@${studio.handle}`);
	const gearLines = $derived(studio.gear.split('\n').filter(Boolean));
	const structured = $derived({
		name: studio.name,
		alternateName: `@${studio.handle}`,
		url,
		description,
		...(studio.commune
			? {
					address: {
						'@type': 'PostalAddress',
						addressLocality: studio.commune,
						addressCountry: 'FR'
					}
				}
			: {})
	});
	const euros = (n: number) => `${n} €`;
</script>

<SEO title="{studio.name} (@{studio.handle})" {description} {url} />
<StructuredData type="LocalBusiness" data={structured} />

<div class="min-h-screen w-full px-4 {memberShell ? 'pt-6 pb-24' : 'py-24'}">
	<div class="mx-auto max-w-5xl space-y-6">
		{#if studio.isManager}
			<p class="rounded-lg border bg-muted/40 p-3 text-sm">
				C'est la page publique de ton studio, telle que les autres la voient.
				<a href="/studios/{studio.handle}" class="underline">Modifier la fiche</a>
			</p>
		{/if}

		<div class="grid gap-6 lg:grid-cols-3">
			<div class="space-y-6 lg:col-span-2">
				<Card.Root class="overflow-hidden pt-0">
					<div
						class="h-32 bg-slate-900 bg-[radial-gradient(circle_at_25%_35%,var(--color-sky-500),transparent_50%),radial-gradient(circle_at_80%_60%,var(--color-violet-600),transparent_55%)]"
					></div>
					<Card.Content class="-mt-12 space-y-4">
						<div class="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:gap-4">
							<Avatar.Root class="size-24 border-4 border-background shadow-xl">
								<Avatar.Fallback class="bg-sky-100 text-3xl font-bold text-sky-900"
									>{initialsOf(studio.name)}</Avatar.Fallback
								>
							</Avatar.Root>
							<div class="min-w-0 flex-1 space-y-2">
								<h1 class="flex items-center gap-2 text-3xl font-black tracking-tight">
									{studio.name}
									{#if studio.verified}
										<BadgeCheck class="size-6 shrink-0 text-sky-600" aria-hidden="true" />
										<span class="sr-only">(studio vérifié)</span>
									{/if}
								</h1>
								<p
									class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"
								>
									<span>Studio</span>
									{#if studio.commune}
										<span class="inline-flex items-center gap-1"
											><MapPin class="size-4" aria-hidden="true" />{studio.commune}</span
										>
									{/if}
								</p>
								{#if studio.rank.tier}
									<TierBadge
										id={studio.rank.tier.id}
										label={studio.rank.tier.label}
										prefix="Rang du studio :"
									/>
								{/if}
							</div>
						</div>
						{#if studio.bio}
							<p class="whitespace-pre-line">{studio.bio}</p>
						{/if}
						<ul class="flex flex-wrap gap-2" aria-label="Ce que propose le studio">
							{#each services as service (service)}
								<li class="rounded-full border px-3 py-1 text-sm font-medium">{service}</li>
							{/each}
						</ul>
					</Card.Content>
				</Card.Root>

				{#if studio.photos.length > 0}
					<!-- Photos du studio (P4-03b) : la première en grand. -->
					<ul class="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Photos du studio">
						{#each studio.photos as photo, i (photo.id)}
							<li class={i === 0 ? 'col-span-2 row-span-2' : ''}>
								<img
									src={photo.url}
									alt={photo.title}
									loading={i === 0 ? 'eager' : 'lazy'}
									class="h-full w-full rounded-xl border object-cover {i === 0
										? 'aspect-[4/3]'
										: 'aspect-square'}"
								/>
							</li>
						{/each}
					</ul>
				{/if}

				<Card.Root>
					<Card.Header>
						<Card.Title
							><h2 class="flex items-center gap-2">
								<Mic class="size-5" aria-hidden="true" />Salles et tarifs
							</h2></Card.Title
						>
					</Card.Header>
					<Card.Content class="space-y-3">
						<ul class="divide-y">
							{#each studio.rooms as room (room.name)}
								<li class="flex items-start justify-between gap-4 py-3 first:pt-0">
									<div>
										<p class="font-semibold">{room.name}</p>
										{#if room.description}
											<p class="text-sm text-muted-foreground">{room.description}</p>
										{/if}
									</div>
									{#if room.hourlyRate !== null}
										<p class="shrink-0 font-semibold">
											{euros(room.hourlyRate)}<span
												class="text-sm font-normal text-muted-foreground"
											>
												/ heure</span
											>
										</p>
									{/if}
								</li>
							{/each}
						</ul>
						{#if studio.pricingNotes}
							<p class="rounded-lg bg-muted/50 p-3 text-sm">{studio.pricingNotes}</p>
						{/if}
						<p class="text-xs text-muted-foreground">
							Tarifs indicatifs donnés par le studio : le devis se fait avec lui.
						</p>
					</Card.Content>
				</Card.Root>

				{#if gearLines.length > 0}
					<Card.Root>
						<Card.Header>
							<Card.Title
								><h2 class="flex items-center gap-2">
									<Wrench class="size-5" aria-hidden="true" />Matériel
								</h2></Card.Title
							>
						</Card.Header>
						<Card.Content>
							<ul class="grid gap-1.5 text-sm sm:grid-cols-2">
								{#each gearLines as line, i (i)}
									<li>{line}</li>
								{/each}
							</ul>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>

			<div class="space-y-6">
				<Card.Root>
					<Card.Header>
						<Card.Title
							><h2 class="flex items-center gap-2">
								<CalendarClock class="size-5" aria-hidden="true" />Horaires
							</h2></Card.Title
						>
					</Card.Header>
					<Card.Content class="space-y-2 text-sm">
						{#if studio.hours.length > 0}
							<dl class="space-y-1">
								{#each studio.hours as day (day.weekday)}
									<div class="flex justify-between gap-3">
										<dt>{WEEKDAY_LABELS[day.weekday]}</dt>
										<dd class="text-muted-foreground">
											{displayTime(day.opensAt)} à {displayTime(day.closesAt)}
										</dd>
									</div>
								{/each}
							</dl>
						{/if}
						{#if studio.byAppointment}
							<p class="text-muted-foreground">
								{studio.hours.length > 0 ? 'Aussi sur rendez-vous.' : 'Sur rendez-vous.'}
							</p>
						{/if}
					</Card.Content>
				</Card.Root>

				{#if studio.managers.length > 0}
					<Card.Root>
						<Card.Header>
							<Card.Title><h2>Pour réserver</h2></Card.Title>
						</Card.Header>
						<Card.Content class="space-y-3 text-sm">
							<p class="text-muted-foreground">Écris à la personne qui gère le studio.</p>
							<ul class="space-y-2">
								{#each studio.managers as manager (manager.handle)}
									<li>
										<a
											href="/@{manager.handle}"
											class="flex min-h-11 items-center gap-2 rounded-lg hover:bg-muted"
										>
											<Avatar.Root class="size-9">
												<Avatar.Fallback>{initialsOf(manager.displayName)}</Avatar.Fallback>
											</Avatar.Root>
											<span class="font-medium">{manager.displayName}</span>
										</a>
									</li>
								{/each}
							</ul>
						</Card.Content>
					</Card.Root>
				{/if}

				{#if canReport && !studio.isManager}
					<details class="rounded-lg border p-3 text-sm">
						<summary class="cursor-pointer text-muted-foreground">Signaler ce studio</summary>
						<form method="POST" action="?/report" use:enhance class="mt-3 space-y-3">
							<div class="space-y-1">
								<label for="reason" class="block font-medium">Motif</label>
								<select
									id="reason"
									name="reason"
									required
									class="w-full rounded-md border bg-background p-2"
								>
									<option value="">—</option>
									{#each REPORT_REASONS as r (r)}
										<option value={r}>{REPORT_REASON_LABELS[r]}</option>
									{/each}
								</select>
							</div>
							<div class="space-y-1">
								<label for="details" class="block font-medium">Précisions (facultatif)</label>
								<textarea
									id="details"
									name="details"
									rows="3"
									maxlength={MAX_REPORT_DETAILS}
									class="w-full rounded-md border bg-background p-2"
								></textarea>
							</div>
							<button type="submit" class="rounded-md border px-3 py-1.5"
								>Envoyer le signalement</button
							>
						</form>
					</details>
				{/if}
			</div>
		</div>
	</div>
</div>
