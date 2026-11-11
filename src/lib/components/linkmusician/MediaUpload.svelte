<script lang="ts">
	/**
	 * LINKMUSICIAN: envoi d'un fichier (P1-08b). Le fichier part directement du
	 * navigateur vers Cloudinary, avec des paramètres signés par le serveur
	 * (`/api/media/sign`) ; puis le serveur relit le fichier (`/api/media/confirm`).
	 * Avec `forHandle` : photo au nom d'un studio que la personne gère (P4-03b).
	 */
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Button } from '#shadcn/button';
	import {
		ACCEPT_ATTRIBUTE,
		checkDeclaredFile,
		DECLARED_FILE_MESSAGES,
		UPLOAD_TYPES
	} from '#lib/media/upload';
	import { MAX_TITLE_LENGTH } from '#lib/media/rules';

	let {
		instruments = [],
		disabled = false,
		forHandle
	}: {
		instruments?: { id: string; name: string }[];
		disabled?: boolean;
		/** Studio au nom duquel on envoie une photo. */
		forHandle?: string;
	} = $props();
	const photosOnly = $derived(Boolean(forHandle));
	const accept = $derived(photosOnly ? UPLOAD_TYPES.IMAGE.mimeTypes.join(',') : ACCEPT_ATTRIBUTE);

	let file = $state<File | null>(null);
	let title = $state('');
	let isDemo = $state(true);
	let instrumentId = $state('');
	let progress = $state<number | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);

	function onFile(event: Event) {
		file = (event.currentTarget as HTMLInputElement).files?.[0] ?? null;
		if (file && !title) title = file.name.replace(/\.[^.]+$/, '');
	}

	function sendToCloudinary(url: string, fields: Record<string, string | number>, f: File) {
		return new Promise<void>((resolve, reject) => {
			const body = new FormData();
			for (const [k, v] of Object.entries(fields)) body.append(k, String(v));
			body.append('file', f);
			const xhr = new XMLHttpRequest();
			xhr.open('POST', url);
			xhr.upload.onprogress = (e) => {
				if (e.lengthComputable) progress = Math.round((e.loaded / e.total) * 100);
			};
			xhr.onload = () =>
				xhr.status < 300 ? resolve() : reject(new Error('Envoi refusé par Cloudinary'));
			xhr.onerror = () => reject(new Error('Envoi interrompu'));
			xhr.send(body);
		});
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!file) return;
		const declared = checkDeclaredFile({ mimeType: file.type, bytes: file.size });
		if (!declared.ok) return toast.error(DECLARED_FILE_MESSAGES[declared.reason]);
		progress = 0;
		try {
			const signRes = await fetch('/api/media/sign', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mimeType: file.type,
					bytes: file.size,
					title,
					isDemo: !photosOnly && isDemo,
					instrumentId: instrumentId || null,
					...(forHandle ? { forHandle } : {})
				})
			});
			const signed = await signRes.json();
			if (!signRes.ok) throw new Error(signed.error ?? 'Envoi impossible');
			await sendToCloudinary(signed.uploadUrl, signed.fields, file);
			const confirmRes = await fetch('/api/media/confirm', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ mediaId: signed.mediaId })
			});
			const confirmed = await confirmRes.json();
			if (!confirmRes.ok) throw new Error(confirmed.message ?? 'Vérification impossible');
			(confirmed.status === 'REJECTED' ? toast.error : toast.success)(confirmed.message);
			file = null;
			title = '';
			if (fileInput) fileInput.value = '';
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Envoi impossible');
		} finally {
			progress = null;
		}
	}
</script>

<form onsubmit={submit} class="lm-tile lm-tile--flow space-y-3 p-4">
	<h2 class="font-semibold">{photosOnly ? 'Ajouter une photo' : 'Envoyer un fichier'}</h2>
	<p class="text-xs text-muted-foreground">
		{photosOnly
			? 'JPEG, PNG, WebP ou AVIF, 10 Mo au plus.'
			: 'Photo (10 Mo), audio (10 min, 100 Mo) ou vidéo (3 min, 200 Mo).'}
	</p>
	<div class="space-y-1">
		<label for="file" class="block text-sm font-medium">{photosOnly ? 'Photo' : 'Fichier'}</label>
		<input
			id="file"
			type="file"
			{accept}
			bind:this={fileInput}
			onchange={onFile}
			class="block w-full text-sm"
		/>
	</div>
	<div class="space-y-1">
		<label for="upload-title" class="block text-sm font-medium"
			>{photosOnly ? 'Légende' : 'Titre'}</label
		>
		<input
			id="upload-title"
			type="text"
			maxlength={MAX_TITLE_LENGTH}
			bind:value={title}
			class="lm-field w-full"
		/>
	</div>
	{#if instruments.length > 0}
		<div class="space-y-1">
			<label for="upload-instrument" class="block text-sm font-medium"
				>Instrument joué (facultatif)</label
			>
			<select id="upload-instrument" bind:value={instrumentId} class="lm-field w-full">
				<option value="">—</option>
				{#each instruments as i (i.id)}
					<option value={i.id}>{i.name}</option>
				{/each}
			</select>
		</div>
	{/if}
	{#if !photosOnly}
		<label class="flex cursor-pointer items-center gap-2 text-sm">
			<input type="checkbox" bind:checked={isDemo} class="size-4" />
			C'est une démo de moi (audio ou vidéo)
		</label>
	{/if}
	{#if progress !== null}
		<div
			class="h-2 overflow-hidden rounded-full bg-muted"
			role="progressbar"
			aria-label="Envoi du fichier"
			aria-valuenow={progress}
			aria-valuemin={0}
			aria-valuemax={100}
		>
			<div class="h-full bg-primary transition-all" style:width="{progress}%"></div>
		</div>
	{/if}
	<Button type="submit" class="w-full" disabled={disabled || !file || progress !== null}>
		{disabled
			? photosOnly
				? 'Limite de photos atteinte'
				: 'Limite de médias atteinte'
			: progress !== null
				? `Envoi… ${progress} %`
				: 'Envoyer'}
	</Button>
</form>
