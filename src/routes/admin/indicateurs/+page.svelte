<script lang="ts">
	// LINKMUSICIAN: indicateurs produit (P1-13). Seuils : conception 05 §2.
	import * as Card from '#shadcn/card';
	import { Badge } from '#shadcn/badge';
	import { TRACKS } from '#lib/actors/tracks';

	let { data } = $props();

	const periods = [
		{ value: '30', label: '30 jours' },
		{ value: '90', label: '90 jours' },
		{ value: '365', label: '1 an' },
		{ value: 'tout', label: 'Depuis le début' }
	];
	const current = $derived(data.period === null ? 'tout' : String(data.period));
	const percent = (v: number) =>
		new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 }).format(v);
	const status = {
		ok: { label: 'Objectif atteint', class: 'bg-emerald-100 text-emerald-900' },
		below: { label: 'Sous l’objectif', class: 'bg-amber-100 text-amber-900' },
		empty: { label: 'Pas encore assez de recul', class: 'bg-muted text-muted-foreground' },
		na: { label: 'Pas encore mesurable', class: 'bg-muted text-muted-foreground' }
	} as const;
	const maxWeek = $derived(Math.max(1, ...data.weekly.map((w) => w.count)));
	const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
</script>

<div class="space-y-6 p-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold">Indicateurs produit</h1>
			<p class="text-sm text-muted-foreground">
				Cohorte : {data.cohortSize} personne{data.cohortSize > 1 ? 's' : ''} inscrite{data.cohortSize >
				1
					? 's'
					: ''} sur la période. Hypothèse et seuils du MVP : conception 05 §2.
			</p>
		</div>
		<nav aria-label="Période" class="flex flex-wrap gap-2">
			{#each periods as p (p.value)}
				<a
					href="?periode={p.value}"
					aria-current={current === p.value ? 'page' : undefined}
					class="rounded-md border px-3 py-1.5 text-sm {current === p.value
						? 'bg-primary text-primary-foreground'
						: ''}">{p.label}</a
				>
			{/each}
		</nav>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each data.indicators as i (i.id)}
			<Card.Root>
				<Card.Header>
					<Card.Title><h2 class="text-base">{i.label}</h2></Card.Title>
					<Card.Description>{i.note}</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-2">
					<p class="text-3xl font-black tabular-nums">
						{i.value === null ? '—' : percent(i.value)}
					</p>
					<p class="text-sm text-muted-foreground">
						{#if i.status === 'na'}
							Arrive avec la messagerie et les collaborations (phase 2).
						{:else}
							{i.numerator} sur {i.denominator} · objectif {i.target.kind === 'min' ? '≥' : '<'}
							{percent(i.target.value)}
						{/if}
					</p>
					<Badge class={status[i.status].class}>{status[i.status].label}</Badge>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title><h2 class="text-base">Inscriptions par semaine</h2></Card.Title>
				<Card.Description>Les 8 dernières semaines, toutes cohortes.</Card.Description>
			</Card.Header>
			<Card.Content>
				<table class="w-full text-sm">
					<caption class="sr-only">Inscriptions par semaine</caption>
					<thead>
						<tr class="text-left text-muted-foreground">
							<th scope="col" class="py-1 font-normal">Semaine du</th>
							<th scope="col" class="py-1 font-normal">Inscriptions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.weekly as w (w.weekOf)}
							<tr>
								<td class="w-28 py-1">{dateFormat.format(new Date(`${w.weekOf}T12:00:00Z`))}</td>
								<td class="py-1">
									<span class="flex items-center gap-2">
										<span
											class="h-3 rounded-sm bg-primary"
											style:width="{(w.count / maxWeek) * 100}%"
											aria-hidden="true"
										></span>
										<span class="tabular-nums">{w.count}</span>
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title><h2 class="text-base">Demande par métier</h2></Card.Title>
				<Card.Description
					>Tous les comptes. Sert à décider quand ouvrir un métier (conception 06 §2).</Card.Description
				>
			</Card.Header>
			<Card.Content>
				<table class="w-full text-sm">
					<caption class="sr-only">Personnes par métier</caption>
					<thead>
						<tr class="text-left text-muted-foreground">
							<th scope="col" class="py-1 font-normal">Métier</th>
							<th scope="col" class="py-1 text-right font-normal">Principal</th>
							<th scope="col" class="py-1 text-right font-normal">Secondaire</th>
						</tr>
					</thead>
					<tbody>
						{#each data.tracks as t (t.track)}
							<tr class="border-t">
								<td class="py-1">{TRACKS[t.track].label}</td>
								<td class="py-1 text-right tabular-nums">{t.primary}</td>
								<td class="py-1 text-right tabular-nums">{t.secondary}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</Card.Content>
		</Card.Root>
	</div>
</div>
