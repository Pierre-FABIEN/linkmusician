<script lang="ts">
	// LINKMUSICIAN: accueil du centre d'aide, voir +page.server.ts.
	import HelpArticle from '#lib/components/linkmusician/aide/HelpArticle.svelte';

	let { data } = $props();
</script>

<HelpArticle page={data.page} help={data.help} memberShell={Boolean(data.memberShell)} />
