// LINKMUSICIAN: journal de modération (P3-09) : chaque décision, qui, quoi,
// sur quelle cible, avec son motif. Lecture seule ; la garde est dans le
// layout de `/moderation`.
import { moderationJournal } from '#lib/server/moderation/journal';
import { AUDIT_FAMILIES, isAuditFamily } from '#lib/moderation/audit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const raw = url.searchParams.get('famille');
	const family = isAuditFamily(raw) ? raw : undefined;
	const before = url.searchParams.get('avant');
	const journal = await moderationJournal({
		family,
		before: before && !Number.isNaN(Date.parse(before)) ? new Date(before) : undefined
	});
	return {
		...journal,
		family: family ?? '',
		families: Object.entries(AUDIT_FAMILIES).map(([value, label]) => ({ value, label }))
	};
};
