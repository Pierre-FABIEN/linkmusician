<script lang="ts">
	// LINKMUSICIAN: récap de campagne d'un morceau (P4-10) : de l'idée au son
	// final, avec les pros et les studios qui l'ont fait avancer. Données :
	// `workJourney`. La fête n'arrive qu'une fois la campagne bouclée.
	import { BadgeCheck, Disc3, Lightbulb, Mic, PartyPopper, Sliders, Sparkles } from 'lucide-svelte';
	import {
		campaignDays,
		JOURNEY_BY,
		JOURNEY_LABELS,
		type JourneyKind,
		type JourneyStep
	} from '#lib/works/journey';

	let {
		journey
	}: {
		journey: {
			steps: JourneyStep[];
			done: boolean;
			finishedAt: Date | string | null;
			startedAt: Date | string;
		};
	} = $props();

	const ICONS: Record<JourneyKind, typeof Mic> = {
		IDEA: Lightbulb,
		COMPOSED: Sparkles,
		RECORDING: Mic,
		MIXING: Sliders,
		MASTERING: Disc3,
		PRODUCTION: Disc3
	};
	const day = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Europe/Paris'
	});
	const days = $derived(
		journey.finishedAt
			? campaignDays(new Date(journey.startedAt), new Date(journey.finishedAt))
			: null
	);
</script>

<section aria-labelledby="campagne" class="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
	{#if journey.done}
		<div class="flex items-start gap-3">
			<PartyPopper class="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
			<div>
				<h2 id="campagne" class="text-xl font-bold">Campagne bouclée</h2>
				<p class="text-sm text-muted-foreground">
					De l’idée au son final{days ? ` en ${days} jour${days > 1 ? 's' : ''}` : ''}. Voici le
					chemin du morceau.
				</p>
			</div>
		</div>
	{:else}
		<h2 id="campagne" class="text-xl font-bold">Le chemin du morceau</h2>
	{/if}

	<ol class="relative space-y-4 border-l pl-6">
		{#each journey.steps as step, i (i)}
			{@const Icon = ICONS[step.kind]}
			<li class="relative">
				<span
					class="absolute top-0.5 -left-[2.1rem] grid size-7 place-items-center rounded-full border bg-background"
				>
					<Icon class="size-4" aria-hidden="true" />
				</span>
				<p class="font-semibold">
					{JOURNEY_LABELS[step.kind]}
					<span class="font-normal text-muted-foreground">· {day.format(new Date(step.at))}</span>
				</p>
				{#if step.people}
					<p class="text-sm text-muted-foreground">
						{step.people > 1 ? `À ${step.people}, crédits confirmés` : 'Crédit confirmé'}
					</p>
				{/if}
				{#if step.pro || step.studio}
					<p class="text-sm text-muted-foreground">
						{#if step.pro}
							{JOURNEY_BY[step.kind] ? `${JOURNEY_BY[step.kind]} : ` : ''}<a
								href="/@{step.pro.handle}"
								class="underline">{step.pro.name}</a
							>
						{/if}
						{#if step.studio}
							{step.pro ? ' · ' : ''}au studio
							<a href="/@{step.studio.handle}" class="underline">{step.studio.name}</a>
						{/if}
					</p>
				{/if}
				{#if step.verified}
					<p class="inline-flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-400">
						<BadgeCheck class="size-4" aria-hidden="true" />
						A vérifié l’étape « Premier enregistrement » du groupe
					</p>
				{/if}
			</li>
		{/each}
	</ol>
</section>
