<script lang="ts">
	import type { HTMLAttributes } from 'svelte';

	type Props = HTMLAttributes<HTMLDivElement> & {
		/** Intensité des voiles (subtle, medium, strong) */
		intensity?: 'subtle' | 'medium' | 'strong';
		/** Vitesse de dérive (multiplicateur: 2 = 2x plus rapide) */
		speed?: number;
		/** Affiche les couleurs des 8 tons Metro, ou custom CSS colors */
		tones?: Array<string>;
		/** Fondu à partir du coin (true = fondu, false = remplissage complet) */
		fade?: boolean;
	};

	let {
		intensity = 'medium',
		speed = 1,
		tones = ['var(--tone-violet)', 'var(--tone-rose)', 'var(--tone-blue)', 'var(--tone-orange)'],
		fade = true,
		class: className,
		...rest
	}: Props = $props();

	const speedMs = Math.round(60000 / speed);
	const opacityScale = intensity === 'subtle' ? 0.4 : intensity === 'strong' ? 1 : 0.7;
</script>

<div
	class="lm-aurora {fade ? 'lm-aurora--fade' : ''} {className || ''}"
	style="--aurora-speed-ms: {speedMs}ms; --aurora-opacity: {opacityScale};"
	{...rest}
>
	<!-- Layer 1 : Voiles principaux -->
	<div
		class="lm-aurora__layer lm-aurora__layer--1"
		style="--aurora-color-1: {tones[0]}; --aurora-color-2: {tones[1]}; --aurora-color-3: {tones[2]};"
		aria-hidden="true"
	></div>
	<!-- Layer 2 : Voiles secondaires (décalés) -->
	<div
		class="lm-aurora__layer lm-aurora__layer--2"
		style="--aurora-color-1: {tones[2]}; --aurora-color-2: {tones[3]}; --aurora-color-3: {tones[0]};"
		aria-hidden="true"
	></div>
	<!-- Contenu -->
	<div class="lm-aurora__content">
		<slot />
	</div>
</div>

<style lang="postcss">
	.lm-aurora {
		position: relative;
		overflow: hidden;
		--aurora-speed-ms: 60000ms;
		--aurora-opacity: 0.7;
	}

	/* Layer : repeating gradients avec 3 couleurs Metro */
	.lm-aurora__layer {
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: calc(var(--aurora-opacity) * 0.5);
		/* Deux gradients : bande blanche + gradient coloré */
		background-image:
			repeating-linear-gradient(
				100deg,
				transparent 0%,
				transparent 10%,
				color-mix(in oklch, var(--aurora-color-1) 20%, transparent) 12%,
				color-mix(in oklch, var(--aurora-color-1) 20%, transparent) 16%,
				transparent 18%
			),
			repeating-linear-gradient(
				100deg,
				color-mix(in oklch, var(--aurora-color-1) 60%, transparent) 0%,
				color-mix(in oklch, var(--aurora-color-2) 40%, transparent) 15%,
				color-mix(in oklch, var(--aurora-color-3) 30%, transparent) 30%,
				transparent 40%
			);
		background-size:
			300% 100%,
			200% 100%;
		background-position:
			50% 50%,
			50% 50%;
		background-attachment: fixed;
		will-change: background-position;
	}

	.lm-aurora__layer--1 {
		animation: aurora-drift-1 var(--aurora-speed-ms) linear infinite;
	}

	.lm-aurora__layer--2 {
		animation: aurora-drift-2 calc(var(--aurora-speed-ms) * 1.5) linear infinite;
		opacity: calc(var(--aurora-opacity) * 0.3);
		mix-blend-mode: screen;
	}

	/* Fondu radial depuis le coin (top-right) */
	.lm-aurora--fade .lm-aurora__layer {
		mask-image: radial-gradient(ellipse 70% 100% at 100% 0%, black 20%, transparent 70%);
		-webkit-mask-image: radial-gradient(ellipse 70% 100% at 100% 0%, black 20%, transparent 70%);
	}

	/* Contenu par-dessus les voiles */
	.lm-aurora__content {
		position: relative;
		z-index: 10;
	}

	/* Animations : drift bidirectionnel */
	@keyframes aurora-drift-1 {
		from {
			background-position:
				50% 50%,
				50% 50%;
		}
		to {
			background-position:
				350% 50%,
				350% 50%;
		}
	}

	@keyframes aurora-drift-2 {
		from {
			background-position:
				50% 50%,
				50% 50%;
		}
		to {
			background-position:
				-250% 50%,
				-250% 50%;
		}
	}

	/* Réduire le mouvement si préférence utilisateur */
	@media (prefers-reduced-motion: reduce) {
		.lm-aurora__layer {
			animation: none !important;
			background-attachment: scroll;
		}
	}
</style>
