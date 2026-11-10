<script lang="ts">
	import { parseDate, type DateValue } from '@internationalized/date';
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import '#lib/linkmusician/theme.css';
	import SEO from '#lib/components/SEO.svelte';
	import Aurora from '#lib/components/linkmusician/metro/Aurora.svelte';
	import ActionTile from '#lib/components/linkmusician/metro/ActionTile.svelte';
	import EventTile from '#lib/components/linkmusician/metro/EventTile.svelte';
	import JamTileFrame from '#lib/components/linkmusician/metro/JamTileFrame.svelte';
	import ProfileTile from '#lib/components/linkmusician/metro/ProfileTile.svelte';
	import Tile from '#lib/components/linkmusician/metro/Tile.svelte';
	import * as Calendar from '#shadcn/calendar';
	import {
		ArrowLeft,
		ArrowRight,
		BookUser,
		CalendarDays,
		Check,
		Guitar,
		Heart,
		Moon,
		Music2,
		Radio,
		Sun
	} from 'lucide-svelte';
	import { mode, setMode } from 'mode-watcher';

	type Slot = 'tonight' | 'tomorrow' | 'weekend';
	type CalendarJam = {
		date: string;
		color: string;
		title: string;
		time: string;
		place: string;
		description: string;
	};

	const dark = $derived(mode.current === 'dark');
	let selectedSlot = $state<Slot | null>('weekend');
	let joinedJam = $state(false);
	let selectedDate = $state<DateValue | undefined>(parseDate('2026-11-14'));
	let calendarPlaceholder = $state<DateValue>(parseDate('2026-11-14'));
	const activeDate = $derived(selectedDate ?? calendarPlaceholder);
	const calendarJams: CalendarJam[] = [
		{
			date: '2026-11-14',
			color: '#a78bfa',
			title: 'Jazz au comptoir',
			time: '20 h 30',
			place: 'Toulouse',
			description: 'Jam ouverte, scène accueillante.'
		},
		{
			date: '2026-11-21',
			color: '#42c7b5',
			title: 'Scène ouverte du canal',
			time: '19 h',
			place: 'Toulouse',
			description: 'Une scène ouverte aux projets du quartier.'
		},
		{
			date: '2026-11-28',
			color: '#f2a45e',
			title: 'Jam funk du samedi',
			time: '21 h',
			place: 'Blagnac',
			description: 'Une soirée groove, cuivres et improvisation.'
		}
	];
	const jamDayLabel = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Europe/Paris'
	});
	const jamListDate = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'short',
		timeZone: 'Europe/Paris'
	});

	const slots: { id: Slot; label: string }[] = [
		{ id: 'tonight', label: 'Ce soir' },
		{ id: 'tomorrow', label: 'Demain' },
		{ id: 'weekend', label: 'Ce week-end' }
	];

	const slotSummary = $derived(
		selectedSlot ? slots.find((slot) => slot.id === selectedSlot)?.label : null
	);
	const upcomingJamCount = calendarJams.length;

	function jamsOn(date: DateValue) {
		return calendarJams.filter((jam) => jam.date === date.toString());
	}

	function selectJam(jam: CalendarJam) {
		const date = parseDate(jam.date);
		selectedDate = date;
		calendarPlaceholder = date;
	}

	function calendarDayLabel(date: DateValue) {
		const label = jamDayLabel.format(new Date(`${date.toString()}T12:00:00.000Z`));
		const count = jamsOn(date).length;
		return count > 0 ? `${label}, ${count} jam${count > 1 ? 's' : ''}` : label;
	}
</script>

<SEO title="Jam Metro · maquette" noindex nofollow />

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

		<div class="lm-jam-board-wrap mt-6">
			<div class="lm-jam-board lm-mosaic" aria-label="Tableau de bord du mode Jam">
				<JamTileFrame class="lm-jam-next" size="big">
				<Tile tone="orange" size="big" class="lm-pattern-tile lm-jam-next">
					<Music2 class="lm-jam-hero-symbol" aria-hidden="true" />
					<div class="flex items-start justify-between gap-4 lm-jam-next__header">
						<div class="space-y-2">
							<p class="lm-tile__kicker">
								<Guitar class="mr-1 inline size-4" aria-hidden="true" />Mode Jam · Toulouse
							</p>
							<h1 class="lm-jam-title">Envie de jouer ce week-end ?</h1>
							<p class="lm-pattern-copy">
								Ta prochaine étape : signale tes disponibilités pour rencontrer les musicien·nes du
								coin.
							</p>
						</div>
						<p class="lm-jam-step">Étape <strong>2</strong><span>sur 5</span></p>
					</div>
					<div class="space-y-3">
						<div
							class="lm-bar"
							role="progressbar"
							aria-label="Avancement du mode Jam"
							aria-valuemin="0"
							aria-valuemax="5"
							aria-valuenow="1"
						>
							<i style="--progress:0.2"></i>
						</div>
						<div class="flex flex-wrap items-center justify-between gap-3">
							<p class="lm-tile__text">
								Après ça : écrire à un·e musicien·ne et choisir un lieu pour jouer.
							</p>
							<a class="lm-btn" href="#jam-disponibilites">
								<Radio class="size-4" aria-hidden="true" />Choisir mes dispos
							</a>
						</div>
					</div>
				</Tile>
				</JamTileFrame>

				<JamTileFrame class="lm-jam-availability" size="md">
				<Tile
					id="jam-disponibilites"
					tone="cyan"
					size="md"
					class="lm-pattern-tile lm-jam-availability"
				>
					<div class="space-y-2">
						<p class="lm-tile__kicker">
							<Radio class="mr-1 inline size-4" aria-hidden="true" />Mes disponibilités
						</p>
						<h2 class="lm-pattern-title">Quand as-tu envie de jouer ?</h2>
					</div>
					<div class="lm-jam-slots" role="group" aria-label="Choisir un créneau de disponibilité">
						{#each slots as slot (slot.id)}
							<button
								type="button"
								aria-pressed={selectedSlot === slot.id}
								onclick={() => (selectedSlot = selectedSlot === slot.id ? null : slot.id)}
								>{#if selectedSlot === slot.id}<Check
										class="size-4"
										aria-hidden="true"
									/>{/if}{slot.label}</button
							>
						{/each}
					</div>
					<p class="lm-tile__text" aria-live="polite">
						{#if slotSummary}
							Tu es dispo : {slotSummary.toLowerCase()}.
						{:else}
							Tu n’as pas indiqué de disponibilité.
						{/if}
					</p>
					<a class="lm-pattern-action" href="/_lab/metro"
						>Gérer mes créneaux <ArrowRight class="size-4" aria-hidden="true" /></a
					>
				</Tile>
				</JamTileFrame>

				<JamTileFrame class="lm-profile-tile">
				<ProfileTile
					tone="lime"
					href="/_lab/metro"
					initials="MB"
					name="Malik B."
					instrument="Batterie · confirmé"
					genres={['Funk', 'Hip-hop']}
					location="Toulouse"
					distance="à moins de 5 km"
				/>
				</JamTileFrame>

				<JamTileFrame class="lm-action-tile" size="band">
				<ActionTile
					tone="amber"
					size="band"
					eyebrow="Organisateur·rice · optionnel"
					title="Une jam manque dans l’agenda ?"
					detail="Propose un lieu, une date et les places par instrument."
					actionLabel="Lancer une jam"
					href="/_lab/metro"
				/>
				</JamTileFrame>

				<JamTileFrame class="lm-jam-appreciation" size="md">
				<Tile tone="rose" size="md" class="lm-pattern-tile lm-jam-appreciation">
					<div class="flex items-start justify-between gap-3">
						<p class="lm-tile__kicker">
							<Heart class="mr-1 inline size-4" aria-hidden="true" />Après la jam
						</p>
						<span class="lm-pill">2 à apprécier</span>
					</div>
					<div class="space-y-3">
						<h2 class="lm-pattern-title lm-pattern-title--large">Garde le bon contact.</h2>
						<p class="lm-pattern-copy">
							Dis ce que tu as aimé chez les personnes avec qui tu as joué.
						</p>
					</div>
					<a class="lm-pattern-action" href="/_lab/metro"
						>Apprécier les musicos <ArrowRight class="size-4" aria-hidden="true" /></a
					>
				</Tile>
				</JamTileFrame>

				<JamTileFrame class="lm-event-tile" size="wide">
				<EventTile
					month="nov."
					day="14"
					time="samedi · 20 h 30"
					title="Jazz au comptoir"
					description="Jam ouverte, scène accueillante. Viens avec ton instrument ou simplement écouter."
					place="Toulouse"
					attendees="8 participant·es"
					availability="3 places recherchées"
					joined={joinedJam}
					onJoin={() => (joinedJam = !joinedJam)}
				/>
				</JamTileFrame>

				<JamTileFrame class="lm-jam-calendar" size="wide">
				<Tile tone="violet" size="wide" class="lm-pattern-tile lm-jam-calendar">
					<div class="flex items-center justify-between gap-3">
						<div>
							<p class="lm-tile__kicker">Agenda Jam</p>
							<h2 class="lm-pattern-title">Le calendrier des jams</h2>
						</div>
						<span class="lm-pill">{upcomingJamCount} jams à venir</span>
					</div>
					<div class="lm-jam-calendar__content">
						<CalendarPrimitive.Root
							type="single"
							bind:value={selectedDate}
							bind:placeholder={calendarPlaceholder}
							locale="fr-FR"
							weekStartsOn={1}
							weekdayFormat="short"
							calendarLabel="Calendrier des jams à venir"
							class="lm-jam-calendar__picker"
						>
							{#snippet children({ months, weekdays })}
								<Calendar.Header class="pb-2">
									<Calendar.PrevButton aria-label="Mois précédent" class="size-9 opacity-100" />
									<Calendar.Heading class="text-base font-bold capitalize" />
									<Calendar.NextButton aria-label="Mois suivant" class="size-9 opacity-100" />
								</Calendar.Header>
								<Calendar.Months>
									{#each months as month (month)}
										<Calendar.Grid>
											<Calendar.GridHead>
												<Calendar.GridRow class="justify-around">
													{#each weekdays as weekday (weekday)}
														<Calendar.HeadCell class="w-8 text-center">
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
															<Calendar.Cell {date} month={month.value} class="size-8">
																{@const dateJams = jamsOn(date)}
																<Calendar.Day
																	aria-label={calendarDayLabel(date)}
																	data-jam-color={dateJams[0]?.color}
																	style={dateJams[0]
																		? `--jam-color: ${dateJams[0].color}`
																		: undefined}
																	class="relative size-8 rounded-xl font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
																>
																	{date.day}
																	{#if dateJams.length > 0}
																		<span
																			aria-hidden="true"
																			class="lm-jam-calendar__day-mark absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full"
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
						<div class="lm-jam-calendar__selection" aria-live="polite">
							<p class="lm-tile__kicker">{calendarJams.length} jams à venir</p>
							{#if calendarJams.length > 0}
								<ul class="lm-jam-calendar__event-list" aria-label="Toutes les jams à venir">
									{#each calendarJams as jam (jam.date + jam.title)}
										<li>
											<button
												type="button"
												class="lm-jam-calendar__event"
												class:lm-jam-calendar__event--selected={activeDate.toString() === jam.date}
												data-jam-color={jam.color}
												style={`--jam-color: ${jam.color}`}
												aria-pressed={activeDate.toString() === jam.date}
												onclick={() => selectJam(jam)}
											>
												<span class="lm-jam-calendar__event-date">
													{jamListDate.format(new Date(`${jam.date}T12:00:00.000Z`))}
												</span>
												<span class="lm-jam-calendar__event-info">
													<strong>{jam.title}</strong>
													<span>{jam.time} · {jam.place}</span>
													<span>{jam.description}</span>
												</span>
											</button>
										</li>
									{/each}
								</ul>
							{:else}
								<div class="space-y-2">
									<CalendarDays class="size-6" aria-hidden="true" />
									<p class="lm-tile__text">Aucune jam à venir.</p>
								</div>
							{/if}
						</div>
					</div>
				</Tile>
				</JamTileFrame>

				<JamTileFrame class="lm-jam-network" size="wide">
				<Tile tone="ink" size="wide" class="lm-pattern-tile lm-jam-network">
					<div class="flex items-start gap-4">
						<div class="lm-pattern-icon"><BookUser class="size-5" aria-hidden="true" /></div>
						<div class="min-w-0 flex-1 space-y-2">
							<p class="lm-tile__kicker">Mon carnet et mon réseau</p>
							<h2 class="lm-pattern-title lm-pattern-title--large">
								Les personnes avec qui tu as joué.
							</h2>
							<p class="lm-pattern-copy">
								Retrouve tes souvenirs de jam et les musicien·nes croisés en chemin.
							</p>
						</div>
					</div>
					<a class="lm-pattern-action" href="/_lab/metro"
						>Ouvrir mon carnet <ArrowRight class="size-4" aria-hidden="true" /></a
					>
				</Tile>
				</JamTileFrame>
			</div>
		</div>
	</main>
</Aurora>
