<script lang="ts">
	/**
	 * LINKMUSICIAN: fond Aurora (D55, `docs/design` §4.7) : voiles de couleur
	 * animés derrière le contenu. Seulement sur les accueils de mode et le
	 * profil public ; toujours `fade`, intensité `subtle` ou `medium`. Immobile
	 * si l’appareil demande moins d’animations.
	 */
	import type { HTMLAttributes } from 'svelte/elements';

	type Intensity = 'subtle' | 'medium' | 'strong';

	type Props = HTMLAttributes<HTMLDivElement> & {
		/** Intensité des voiles */
		intensity?: Intensity;

		/** Vitesse relative : 2 = deux fois plus rapide */
		speed?: number;

		/** Couleurs des voiles */
		tones?: readonly string[];

		/** Active le fondu radial */
		fade?: boolean;
	};

	let {
		intensity = 'medium',
		speed = 20,
		tones = ['var(--tone-violet)', 'var(--tone-rose)', 'var(--tone-blue)', 'var(--tone-orange)'],
		fade = true,
		class: className,
		style: customStyle,
		children,
		...rest
	}: Props = $props();

	// Écarte les vitesses invalides ou trop basses.
	const safeSpeed = $derived(Number.isFinite(speed) && speed > 0 ? Math.max(speed, 0.1) : 1);

	// Durée de base de l’animation, en millisecondes.
	const speedMs = $derived(Math.round(60_000 / safeSpeed));

	const opacityScale = $derived(intensity === 'subtle' ? 0.4 : intensity === 'strong' ? 1 : 0.7);
</script>

<div
	class={['lm-aurora', fade && 'lm-aurora--fade', className].filter(Boolean).join(' ')}
	style={[
		customStyle,
		`--aurora-speed-ms: ${speedMs}ms`,
		`--aurora-opacity: ${opacityScale}`,
		`--aurora-color-1: ${tones[0] ?? 'transparent'}`,
		`--aurora-color-2: ${tones[1] ?? 'transparent'}`,
		`--aurora-color-3: ${tones[2] ?? 'transparent'}`,
		`--aurora-color-4: ${tones[3] ?? 'transparent'}`
	]
		.filter(Boolean)
		.join(';')}
	{...rest}
>
	<!-- Voile principal -->
	<div class="lm-aurora__layer lm-aurora__layer--1" aria-hidden="true"></div>

	<!-- Voile secondaire -->
	<div class="lm-aurora__layer lm-aurora__layer--2" aria-hidden="true"></div>

	<!-- Contenu au premier plan -->
	<div class="lm-aurora__content">
		{@render children?.()}
	</div>
</div>

<style>
	.lm-aurora {
		position: relative;
		overflow: clip;

		--aurora-speed-ms: 60000ms;
		--aurora-opacity: 0.7;
	}

	/* Calques de dégradés */
	.lm-aurora__layer {
		position: absolute;
		inset: 0;
		pointer-events: none;

		opacity: calc(var(--aurora-opacity) * 0.5);
	}

	/* Rayons de lumière */
	.lm-aurora__layer::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;

		width: 400%;
		height: 100%;

		background-image: repeating-linear-gradient(
			100deg,
			transparent 0%,
			transparent 10%,
			color-mix(in oklch, var(--aurora-color-1) 20%, transparent) 12%,
			color-mix(in oklch, var(--aurora-color-1) 20%, transparent) 16%,
			transparent 18%
		);

		background-size: 75% 100%;
		background-repeat: repeat-x;

		transform: translate3d(0, 0, 0);
	}

	/* Dégradés aux tons Metro */
	.lm-aurora__layer::after {
		content: '';
		position: absolute;
		top: 0;
		left: -50%;

		width: 500%;
		height: 100%;

		background-image: repeating-linear-gradient(
			100deg,
			color-mix(in oklch, var(--aurora-color-1) 60%, transparent) 0%,
			color-mix(in oklch, var(--aurora-color-2) 40%, transparent) 15%,
			color-mix(in oklch, var(--aurora-color-3) 30%, transparent) 30%,
			transparent 40%
		);

		background-size: 40% 100%;
		background-repeat: repeat-x;

		transform: translate3d(0, 0, 0);
	}

	/* Calque principal */
	.lm-aurora__layer--1::before {
		animation: lm-aurora-rays-forward calc(var(--aurora-speed-ms) * 0.5) linear infinite;
	}

	.lm-aurora__layer--1::after {
		animation: lm-aurora-colors-forward var(--aurora-speed-ms) linear infinite;
	}

	/* Calque secondaire */
	.lm-aurora__layer--2 {
		opacity: calc(var(--aurora-opacity) * 0.3);
		mix-blend-mode: screen;
	}

	.lm-aurora__layer--2::before {
		animation: lm-aurora-rays-reverse calc(var(--aurora-speed-ms) * 0.75) linear infinite;
	}

	.lm-aurora__layer--2::after {
		animation: lm-aurora-colors-reverse calc(var(--aurora-speed-ms) * 1.5) linear infinite;
	}

	/* Fondu radial */
	.lm-aurora--fade .lm-aurora__layer {
		-webkit-mask-image: radial-gradient(ellipse 70% 100% at 100% 0%, black 20%, transparent 70%);

		mask-image: radial-gradient(ellipse 70% 100% at 100% 0%, black 20%, transparent 70%);
	}

	/* Contenu au premier plan */
	.lm-aurora__content {
		position: relative;
		z-index: 10;
	}

	/* Rayons principaux : vers l’avant */
	@keyframes lm-aurora-rays-forward {
		from {
			transform: translate3d(0, 0, 0);
		}

		to {
			transform: translate3d(-75%, 0, 0);
		}
	}

	/* Rayons secondaires : à rebours */
	@keyframes lm-aurora-rays-reverse {
		from {
			transform: translate3d(0, 0, 0);
		}

		to {
			transform: translate3d(75%, 0, 0);
		}
	}

	/* Couleurs principales : vers l’avant */
	@keyframes lm-aurora-colors-forward {
		from {
			transform: translate3d(0, 0, 0);
		}

		to {
			transform: translate3d(-60%, 0, 0);
		}
	}

	/* Couleurs secondaires : à rebours */
	@keyframes lm-aurora-colors-reverse {
		from {
			transform: translate3d(0, 0, 0);
		}

		to {
			transform: translate3d(60%, 0, 0);
		}
	}

	/* Mouvement réduit */
	@media (prefers-reduced-motion: reduce) {
		.lm-aurora__layer::before,
		.lm-aurora__layer::after {
			animation: none;
		}
	}
</style>
