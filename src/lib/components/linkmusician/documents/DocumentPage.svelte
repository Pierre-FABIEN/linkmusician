<script lang="ts">
	/**
	 * LINKMUSICIAN: cadre d'un document imprimable (P3-15b) : retour et
	 * « Imprimer ou enregistrer en PDF » à l'écran, masqués à l'impression.
	 */
	import type { Snippet } from 'svelte';
	import { ArrowLeft, Printer } from 'lucide-svelte';

	let {
		back,
		fiche,
		children
	}: {
		back: { href: string; label: string };
		fiche: { href: string; label: string };
		children: Snippet;
	} = $props();
</script>

<div class="min-h-screen w-full bg-background px-4 py-6 print:bg-white print:p-0 print:text-black">
	<div class="mx-auto max-w-3xl space-y-6">
		<nav
			class="flex flex-wrap items-center justify-between gap-3 print:hidden"
			aria-label="Document"
		>
			<a
				href={back.href}
				class="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline"
			>
				<ArrowLeft class="size-4" aria-hidden="true" />
				{back.label}
			</a>
			<div class="flex flex-wrap items-center gap-3">
				<a
					href={fiche.href}
					class="inline-flex min-h-11 items-center text-sm text-primary underline">{fiche.label}</a
				>
				<button
					type="button"
					onclick={() => window.print()}
					class="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
				>
					<Printer class="size-4" aria-hidden="true" /> Imprimer ou enregistrer en PDF
				</button>
			</div>
		</nav>
		<main
			class="space-y-6 rounded-2xl border bg-card p-6 print:rounded-none print:border-0 print:p-0"
		>
			{@render children()}
		</main>
	</div>
</div>
