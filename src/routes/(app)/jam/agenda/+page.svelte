<script lang="ts">
	// LINKMUSICIAN: « Jams à venir » (P2-14b, D50), voir +page.server.ts.
	import { parseDate, type DateValue } from '@internationalized/date';
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import * as Calendar from '#shadcn/calendar';
	import { parisDayKey } from '#lib/jam/calendar';
	import { Badge } from '#shadcn/badge';
	import { CalendarDays, Clock3, MapPin, Users } from 'lucide-svelte';

	let { data } = $props();
	let selectedDate = $state<DateValue | undefined>(parseDate('2000-01-01'));
	let calendarPlaceholder = $state<DateValue>(parseDate('2000-01-01'));

	$effect(() => {
		selectedDate = parseDate(data.calendarDate);
		calendarPlaceholder = parseDate(data.calendarDate);
	});

	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: 'Europe/Paris'
	});
	const fullDay = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Europe/Paris'
	});
	const hour = new Intl.DateTimeFormat('fr-FR', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Paris'
	});
	const jamsByDay = $derived.by(() => {
		const grouped: Record<string, typeof data.jams> = {};
		for (const jam of data.jams) {
			const key = parisDayKey(new Date(jam.startsAt));
			grouped[key] = [...(grouped[key] ?? []), jam];
		}
		return grouped;
	});
	const activeDate = $derived(selectedDate ?? parseDate(data.calendarDate));
	const selectedJams = $derived(jamsByDay[activeDate.toString()] ?? []);
	const selectedDayLabel = $derived(
		fullDay.format(new Date(`${activeDate.toString()}T12:00:00.000Z`))
	);

	function jamsOn(date: DateValue) {
		return jamsByDay[date.toString()] ?? [];
	}

	function calendarDayLabel(date: DateValue) {
		const count = jamsOn(date).length;
		const label = fullDay.format(new Date(`${date.toString()}T12:00:00.000Z`));
		return count === 0 ? label : `${label}, ${count} jam${count > 1 ? 's' : ''}`;
	}
</script>

<SEO title="Jams à venir" noindex nofollow />

<div class="min-h-screen w-full px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
	<div class="mx-auto max-w-7xl space-y-6">
		<MetroPageHeader
			kicker="Mode jam"
			title="Jams à venir"
			intro="Choisis une date dans le calendrier, puis la jam qui te tente. Les lieux de jam du coin sont en dessous."
		/>
		<section id="jams" class="scroll-mt-24 space-y-3" aria-labelledby="jams-title">
			<div class="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 id="jams-title" class="text-xl font-bold">Le calendrier</h2>
				</div>
				{#if data.jams.length > 0}
					<Badge variant="secondary"
						>{data.jams.length} jam{data.jams.length > 1 ? 's' : ''} à explorer</Badge
					>
				{/if}
			</div>
			{#if !data.commune}
				<p class="lm-tile lm-tile--flow p-6 text-center">
					Indique ta ville pour voir les jams près de chez toi.
					<a href="/profil/ville" class="block pt-2 font-semibold underline">Indiquer ma ville</a>
				</p>
			{:else}
				<div class="grid gap-4 lg:grid-cols-[minmax(26rem,0.78fr)_minmax(0,1.22fr)]">
					<div class="min-w-0 space-y-3">
						<div class="flex items-center gap-2 px-1 text-sm text-muted-foreground">
							<span
								class="inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
								aria-hidden="true">•</span
							>
							<span>Une date marquée, une jam à découvrir</span>
						</div>
						<CalendarPrimitive.Root
							type="single"
							bind:value={selectedDate}
							bind:placeholder={calendarPlaceholder}
							locale="fr-FR"
							weekStartsOn={1}
							weekdayFormat="short"
							calendarLabel="Calendrier des jams à venir"
							class="mx-auto w-full min-w-0 max-w-sm rounded-2xl border bg-background p-3 [--cell-size:2rem] lg:[--cell-size:2.75rem]"
						>
							{#snippet children({ months, weekdays })}
								<Calendar.Header class="pb-2">
									<Calendar.PrevButton aria-label="Mois précédent" class="size-11 opacity-100" />
									<Calendar.Heading class="text-base font-bold capitalize" />
									<Calendar.NextButton aria-label="Mois suivant" class="size-11 opacity-100" />
								</Calendar.Header>
								<Calendar.Months>
									{#each months as month (month)}
										<Calendar.Grid>
											<Calendar.GridHead>
												<Calendar.GridRow class="justify-around">
													{#each weekdays as weekday (weekday)}
														<Calendar.HeadCell class="w-8 text-center lg:w-11">
															<span aria-hidden="true">{weekday.slice(0, 2)}</span>
															<span class="sr-only">{weekday}</span>
														</Calendar.HeadCell>
													{/each}
												</Calendar.GridRow>
											</Calendar.GridHead>
											<Calendar.GridBody>
												{#each month.weeks as weekDates (weekDates)}
													<Calendar.GridRow class="mt-1 justify-around">
														{#each weekDates as date (date)}
															{@const dateJams = jamsOn(date)}
															<Calendar.Cell {date} month={month.value} class="size-8 lg:size-11">
																<Calendar.Day
																	aria-label={calendarDayLabel(date)}
																	class="relative size-8 rounded-xl font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:size-11"
																>
																	{date.day}
																	{#if dateJams.length > 0}
																		<span
																			aria-hidden="true"
																			class="absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-current"
																		></span>
																	{/if}
																</Calendar.Day>
															</Calendar.Cell>
														{/each}
													</Calendar.GridRow>
												{/each}
											</Calendar.GridBody>
										</Calendar.Grid>
									{/each}
								</Calendar.Months>
							{/snippet}
						</CalendarPrimitive.Root>
						<p class="px-1 text-center text-xs text-muted-foreground">
							Navigation au clavier : les flèches parcourent les jours, les boutons changent de
							mois.
						</p>
					</div>

					<div class="min-w-0 space-y-3" aria-labelledby="selected-jams-title">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<div>
								<p class="text-sm text-muted-foreground">Sélection du calendrier</p>
								<h3 id="selected-jams-title" class="text-lg font-bold capitalize">
									{selectedDayLabel}
								</h3>
							</div>
							<Badge variant="outline"
								>{selectedJams.length} jam{selectedJams.length > 1 ? 's' : ''}</Badge
							>
						</div>
						{#if selectedJams.length === 0}
							<div class="lm-tile lm-tile--flow border-dashed p-6 text-center">
								<CalendarDays
									class="mx-auto mb-2 size-8 text-muted-foreground"
									aria-hidden="true"
								/>
								{#if data.jams.length === 0}
									<p class="font-semibold">Pas encore de jam près de chez toi</p>
									<p class="mt-1 text-sm text-muted-foreground">
										Les dates apparaîtront dans ce calendrier. En attendant, écris aux musicos
										dispos pour jouer ensemble.
									</p>
								{:else}
									<p class="font-semibold">Pas de jam ce jour-là</p>
									<p class="mt-1 text-sm text-muted-foreground">
										Choisis une date marquée dans le calendrier pour voir les jams prévues.
									</p>
								{/if}
							</div>
						{:else}
							<ul class="space-y-3" aria-label="Jams à venir">
								{#each selectedJams as j (j.id)}
									<li>
										<a
											href="/jams/{j.id}"
											class="lm-tile lm-tile--flow group block space-y-3 p-4 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
										>
											<span class="flex flex-wrap items-start justify-between gap-2">
												<span class="text-lg font-bold">{j.title}</span>
												<Badge variant="outline">{day.format(new Date(j.startsAt))}</Badge>
											</span>
											<span class="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
												<span class="inline-flex items-center gap-1.5">
													<Clock3 class="size-4" aria-hidden="true" />
													<time datetime={new Date(j.startsAt).toISOString()}>
														{hour.format(new Date(j.startsAt))}
													</time>
												</span>
												<span class="inline-flex items-center gap-1.5">
													<MapPin class="size-4" aria-hidden="true" />
													{j.venue.name} · {j.venue.communeName}
												</span>
												<span class="inline-flex items-center gap-1.5">
													<Users class="size-4" aria-hidden="true" />
													{j.coming} vien{j.coming > 1 ? 'nent' : 't'}
												</span>
											</span>
											<span class="flex flex-wrap items-center justify-between gap-2">
												<span class="text-sm text-muted-foreground">
													{#if j.spots.some((spot) => spot.open > 0)}
														Places ouvertes :
														{j.spots
															.filter((spot) => spot.open > 0)
															.map((spot) => `${spot.open} ${spot.instrument.toLowerCase()}`)
															.join(' · ')}
													{:else}
														Formation en cours
													{/if}
												</span>
												<span class="font-semibold text-primary">
													{j.imComing ? 'Tu viens · Voir la jam' : 'Découvrir la jam'}
												</span>
											</span></a
										>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			{/if}
		</section>

		<section id="lieux" class="scroll-mt-24 space-y-3" aria-labelledby="venues-title">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<h2 id="venues-title" class="text-lg font-semibold">Lieux de jam</h2>
				<a href="/lieux" class="text-sm font-semibold underline">Tous les lieux</a>
			</div>
			{#if data.venues.length === 0}
				<p class="lm-tile lm-tile--flow p-4 text-sm text-muted-foreground">
					Bars, cafés-concerts, MJC, locaux de répète… Ajoute le lieu où tu aimes jouer : les autres
					le trouveront.
					<a href="/lieux/nouveau" class="block pt-2 font-semibold underline">Ajouter un lieu</a>
				</p>
			{:else}
				<ul class="grid gap-3 sm:grid-cols-3" aria-label="Lieux de jam autour de toi">
					{#each data.venues as v (v.id)}
						<li>
							<a href="/lieux/{v.id}" class="lm-tile lm-tile--flow block p-4">
								<span class="block font-semibold">{v.name}</span>
								<span class="text-sm text-muted-foreground">{v.kindLabel} · {v.distance}</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>
