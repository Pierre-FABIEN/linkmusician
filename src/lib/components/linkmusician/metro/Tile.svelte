<script lang="ts">
	/**
	 * LINKMUSICIAN: tuile Metro (refonte). Un seul composant pour toutes les
	 * cards : lien, bouton ou bloc selon les props. Le ton et la taille sont des
	 * attributs, la matière vit dans `metro.css`. Contenu libre en enfant ;
	 * classes utiles : `lm-tile__kicker`, `lm-tile__title`, `lm-tile__text`.
	 */
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import {
		ArrowRight,
		Circle,
		Cloud,
		Drum,
		Music,
		Music4,
		Sparkles,
		Star,
		type Bell
	} from 'lucide-svelte';
	import TileFrame from './TileFrame.svelte';

	import type { Size, Tone } from './tones';
	type Fx = 'notes' | 'trophy' | 'shout' | 'target' | 'rocket' | 'cheers';
	type Bit = { icon: typeof Bell; dx: number; dy: number; r: number; size: number };

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
		 *  animée » dans `metro.css`). `notes` : groove et notes ; `trophy` :
		 *  saut de victoire et étoiles ; `shout` : le mégaphone crie à en
		 *  reculer ; `target` : flèches dans la cible (pas toutes) ; `rocket` :
		 *  la fusée décolle et revient par le bas ; `cheers` : la chope trinque. */
		fx?: Fx;
		children: Snippet;
	} & HTMLAttributes<HTMLElement> = $props();

	const tag = $derived(href ? 'a' : rest.onclick ? 'button' : 'div');
	const Icon = $derived(icon);

	// Trajectoire de chaque particule, en % de sa propre taille, depuis son
	// point de départ (posé par effet dans `metro.css`). La première tourne
	// aussi au repos (`data-idle`), les autres attendent le survol.
	const bits: Record<Fx, Bit[]> = {
		notes: [
			{ icon: Music, dx: -150, dy: -170, r: -24, size: 26 },
			{ icon: Music4, dx: -60, dy: -230, r: 18, size: 20 },
			{ icon: Music, dx: -240, dy: -110, r: -40, size: 18 }
		],
		trophy: [
			{ icon: Star, dx: -190, dy: -130, r: 140, size: 20 },
			{ icon: Sparkles, dx: -50, dy: -210, r: -70, size: 26 },
			{ icon: Star, dx: -240, dy: 10, r: 200, size: 16 }
		],
		shout: [
			{ icon: Drum, dx: -300, dy: -260, r: -50, size: 24 },
			{ icon: Music, dx: -420, dy: -200, r: 30, size: 20 },
			{ icon: Drum, dx: -260, dy: -420, r: 70, size: 18 }
		],
		// Flèches : la première se plante, la seconde rate (au survol).
		target: [
			{ icon: ArrowRight, dx: 0, dy: 0, r: 0, size: 34 },
			{ icon: ArrowRight, dx: 0, dy: 0, r: 0, size: 34 }
		],
		rocket: [
			{ icon: Cloud, dx: -120, dy: 90, r: -20, size: 22 },
			{ icon: Cloud, dx: -60, dy: 140, r: 15, size: 18 },
			{ icon: Cloud, dx: -170, dy: 40, r: -35, size: 16 }
		],
		cheers: [
			{ icon: Circle, dx: -20, dy: -260, r: 0, size: 12 },
			{ icon: Circle, dx: 30, dy: -320, r: 0, size: 9 },
			{ icon: Circle, dx: -60, dy: -220, r: 0, size: 14 }
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
						data-k={k}
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
