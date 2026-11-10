<script lang="ts">
	/**
	 * LINKMUSICIAN: tuile Metro (refonte). Un seul composant pour toutes les
	 * cards : lien, bouton ou bloc selon les props. Le ton et la taille sont des
	 * attributs, la matière vit dans `metro.css`. Contenu libre en enfant ;
	 * classes utiles : `lm-tile__kicker`, `lm-tile__title`, `lm-tile__text`.
	 */
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Music, Music4, Sparkles, Star, type Bell } from 'lucide-svelte';
	import TileFrame from './TileFrame.svelte';

	type Tone = 'violet' | 'rose' | 'blue' | 'orange' | 'amber' | 'lime' | 'cyan' | 'ink' | 'paper';
	type Size = 'sm' | 'md' | 'wide' | 'band' | 'tall' | 'big';

	let {
		tone = 'paper',
		size,
		href,
		index = 0,
		icon,
		framed = false,
		fx,
		class: className = '',
		children,
		...rest
	}: {
		tone?: Tone;
		/** Sans taille : la tuile s'adapte à son conteneur (hors mosaïque). */
		size?: Size;
		href?: string;
		/** Rang d'apparition : décale l'entrée des tuiles d'un même pivot. */
		index?: number;
		/** Grande icône décorative en filigrane. */
		icon?: typeof Bell;
		/** Design « Jam » : la tuile se pose dans un `TileFrame` (ombre, survol sans repeinte). */
		framed?: boolean;
		/** Icône animée : en continu au repos, le reste au survol (voir « Icône
		 *  animée » dans `metro.css`). `notes` : l'icône groove et lâche des
		 *  notes ; `trophy` : elle saute de victoire et lâche des étoiles. */
		fx?: 'notes' | 'trophy';
		children: Snippet;
	} & HTMLAttributes<HTMLElement> = $props();

	const tag = $derived(href ? 'a' : rest.onclick ? 'button' : 'div');
	const Icon = $derived(icon);

	// Trajectoire de chaque particule, en % de sa propre taille, depuis l'icône.
	const bits = {
		notes: [
			{ icon: Music, dx: -150, dy: -170, r: -24, size: 26 },
			{ icon: Music4, dx: -60, dy: -230, r: 18, size: 20 },
			{ icon: Music, dx: -240, dy: -110, r: -40, size: 18 }
		],
		trophy: [
			{ icon: Star, dx: -190, dy: -130, r: 140, size: 20 },
			{ icon: Sparkles, dx: -50, dy: -210, r: -70, size: 26 },
			{ icon: Star, dx: -240, dy: 10, r: 200, size: 16 }
		]
	};
</script>

{#snippet tile()}
	<svelte:element
		this={tag}
		{...rest}
		href={href ?? undefined}
		type={tag === 'button' ? 'button' : undefined}
		class="lm-tile {className}"
		data-tone={tone}
		data-size={size}
		style:--i={framed ? undefined : index}
	>
		{#if Icon && fx}
			<span class="lm-tile-fx" data-fx={fx} aria-hidden="true">
				<span class="lm-tile-fx__ring"></span>
				<span class="lm-tile-fx__ring"></span>
				{#each bits[fx] as bit, k (k)}
					<bit.icon
						class="lm-tile-fx__bit"
						data-idle={k === 0 || undefined}
						style="--k: {k}; --dx: {bit.dx}%; --dy: {bit.dy}%; --r: {bit.r}deg; --s: {bit.size}%"
					/>
				{/each}
				<Icon class="lm-tile-fx__icon" />
			</span>
		{:else if Icon}<Icon class="lm-tile__mark" aria-hidden="true" />{/if}
		{@render children()}
	</svelte:element>
{/snippet}

{#if framed}
	<TileFrame {size} {index}>{@render tile()}</TileFrame>
{:else}
	{@render tile()}
{/if}
