<script lang="ts">
	// LINKMUSICIAN: statut de livraison (DIAGRAM-02), en mot et en ton.
	import { STATUS_LABELS, type DeliveryStatus } from '#lib/diagram/types';
	import { STATUS_TONES } from '#lib/diagram/ui';

	let { status, short = false }: { status: DeliveryStatus; short?: boolean } = $props();
	const SHORT: Record<DeliveryStatus, string> = {
		TESTED: 'Testé',
		IMPLEMENTED: 'Implémenté',
		DESIGNED: 'Conçu',
		PLANNED: 'Prévu',
		DEPRECATED: 'Obsolète'
	};
</script>

<span class="lm-pill dg-status" data-tone={STATUS_TONES[status]} title={STATUS_LABELS[status]}>
	{short ? SHORT[status] : STATUS_LABELS[status]}
</span>

<style>
	.dg-status {
		white-space: nowrap;
	}
</style>
