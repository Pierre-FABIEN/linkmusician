<script lang="ts">
	/**
	 * LINKMUSICIAN: détail d'un nœud (DIAGRAM-03) : acteur, préconditions,
	 * entrées, traitement, données lues et modifiées, conséquences, statut et
	 * références. Tout vient du catalogue, rien n'est écrit dans ce composant.
	 */
	import { X } from 'lucide-svelte';
	import type { DiagramStep } from '#lib/diagram/types';
	import { issueHref } from '#lib/diagram/ui';
	import StatusBadge from './StatusBadge.svelte';

	let {
		step,
		actorLabel,
		process,
		gotoHref,
		gotoLabel,
		onclose,
		headingLevel = 2
	}: {
		step: DiagramStep;
		actorLabel: string;
		process: { id: string; title: string; trigger: string } | null;
		gotoHref: string | null;
		gotoLabel: string | null;
		onclose?: () => void;
		headingLevel?: 2 | 3;
	} = $props();

	const sections = $derived(
		[
			['Préconditions', step.preconditions],
			['Entrées', step.inputs],
			['Traitement et validations', step.validations],
			['Permissions', step.permissions],
			['Données lues', step.reads],
			['Données modifiées', step.writes],
			['Transitions', step.transitions],
			['Conséquences', step.effects],
			['Erreurs et refus', step.errors]
		].filter(([, list]) => (list as string[]).length > 0) as [string, string[]][]
	);
	const code = (s: string) => s.split(/(`[^`]+`)/g);
</script>

<article class="dg-panel lm-tile lm-tile--flow" aria-labelledby="dg-step-title">
	<header class="dg-panel__head">
		<div class="min-w-0">
			<p class="lm-kicker text-muted-foreground">Action · {actorLabel}</p>
			<svelte:element this={`h${headingLevel}`} id="dg-step-title" class="dg-panel__title">
				{step.title}
			</svelte:element>
		</div>
		{#if onclose}
			<button type="button" class="dg-panel__close" onclick={onclose} aria-label="Fermer le détail">
				<X class="size-4" aria-hidden="true" />
			</button>
		{/if}
	</header>

	<div class="dg-panel__meta">
		<StatusBadge status={step.status} />
		{#if gotoHref && gotoLabel}<a class="lm-btn" href={gotoHref}>{gotoLabel}</a>{/if}
	</div>

	{#if step.description}<p class="text-sm">{step.description}</p>{/if}

	{#if process}
		<p class="text-sm">
			Processus : <a class="underline" href="/diagram/processus/{encodeURIComponent(process.id)}"
				>{process.title}</a
			>
			<span class="dg-mono block opacity-75">{process.trigger}</span>
		</p>
	{/if}

	<dl class="dg-panel__list">
		{#each sections as [label, list] (label)}
			<div>
				<dt>{label}</dt>
				<dd>
					<ul>
						{#each list as item, i (i)}
							<li>
								{#each code(item) as part, j (j)}{#if part.startsWith('`')}<code
											>{part.slice(1, -1)}</code
										>{:else}{part}{/if}{/each}
							</li>
						{/each}
					</ul>
				</dd>
			</div>
		{/each}
	</dl>

	{#if step.references.decisions.length + step.references.issues.length + step.references.tests.length + step.references.sourceFiles.length + step.references.docs.length > 0}
		<details class="dg-panel__refs">
			<summary>Références</summary>
			<dl class="dg-panel__list">
				{#if step.references.decisions.length > 0}
					<div>
						<dt>Décisions</dt>
						<dd>
							{#each step.references.decisions as d (d)}<a
									class="lm-pill mr-1"
									href="/diagram/inventaire?decision={d}">{d}</a
								>{/each}
						</dd>
					</div>
				{/if}
				{#if step.references.issues.length > 0}
					<div>
						<dt>Issues</dt>
						<dd>
							{#each step.references.issues as n (n)}<a
									class="lm-pill mr-1"
									href={issueHref(n)}
									target="_blank"
									rel="noopener noreferrer">#{n}</a
								>{/each}
						</dd>
					</div>
				{/if}
				{#each [['Code', step.references.sourceFiles], ['Tests', step.references.tests], ['Conception', step.references.docs]] as [label, files] (label)}
					{#if (files as string[]).length > 0}
						<div>
							<dt>{label}</dt>
							<dd>
								<ul>
									{#each files as f (f)}<li class="dg-mono">{f}</li>{/each}
								</ul>
							</dd>
						</div>
					{/if}
				{/each}
			</dl>
		</details>
	{/if}
</article>

<style>
	.dg-panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
	}
	.dg-panel__head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.dg-panel__title {
		font-family: var(--lm-font-display);
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.2;
	}
	.dg-panel__close {
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 0.5rem;
	}
	.dg-panel__close:hover {
		background: color-mix(in oklch, var(--lm-ink) 8%, transparent);
	}
	.dg-panel__meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}
	.dg-panel__list {
		display: grid;
		gap: 0.625rem;
		font-size: 0.875rem;
	}
	.dg-panel__list dt {
		font-weight: 700;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.8;
	}
	.dg-panel__list ul {
		margin: 0.125rem 0 0;
		padding-left: 1.1rem;
		list-style: disc;
	}
	.dg-panel__refs summary {
		cursor: pointer;
		font-weight: 600;
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
	}
	.dg-mono,
	code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.78rem;
		word-break: break-word;
	}
	code {
		padding: 0 0.2rem;
		border-radius: 0.25rem;
		background: color-mix(in oklch, var(--lm-ink) 8%, transparent);
	}
</style>
