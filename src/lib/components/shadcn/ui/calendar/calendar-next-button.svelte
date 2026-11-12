<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { buttonVariants } from '#lib/components/shadcn/ui/button/index.js';
	import { cn } from '#lib/components/shadcn/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		// LINKMUSICIAN: bits-ui 2.20 impose son `aria-label` anglais (« Previous »,
		// « Next ») par-dessus le nôtre (T3) ; on le repose après ses props.
		'aria-label': ariaLabel,
		...restProps
	}: CalendarPrimitive.PrevButtonProps = $props();
</script>

{#snippet Fallback()}
	<ChevronRightIcon class="size-4" />
{/snippet}

<CalendarPrimitive.NextButton
	bind:ref
	class={cn(
		buttonVariants({ variant: 'outline' }),
		'size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
		className
	)}
	{...restProps}
>
	{#snippet child({ props })}
		<button {...props} aria-label={ariaLabel ?? (props['aria-label'] as string | undefined)}>
			{@render (children || Fallback)()}
		</button>
	{/snippet}
</CalendarPrimitive.NextButton>
