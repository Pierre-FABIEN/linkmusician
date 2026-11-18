/**
 * « Plus tard » et « Pas pour moi » (N4, conception 21 §8.6, D73 Q-NL-4) :
 * seul point d'écriture de `suggestion_choices` (hors suppression du compte).
 *
 * - Le propriétaire vient **toujours de la session** (l'appelant passe la
 *   personne connectée) ; le client n'envoie qu'une intention et une clé.
 * - Un report n'est accepté que pour une suggestion que le serveur
 *   **propose en ce moment** à ce lecteur, aux rangs 3 à 5 : une clé forgée
 *   (objet d'autrui, règle inconnue, rang 1 ou 2) est refusée sans rien
 *   révéler. L'échéance (30 jours) et l'empreinte du fait sont calculées ici.
 * - « Pas pour moi » ne vise qu'une règle des rangs 4 et 5 ou une branche
 *   connue (`parseTarget`), jamais une clé libre.
 * - Une préférence d'affichage : aucun droit, aucune réalisation, aucune
 *   XP ne change. Les reports échus sont purgés au passage (écriture ou page
 *   des choix), sans tâche planifiée.
 */
import { error } from '@sveltejs/kit';
import { prisma } from '#lib/server';
import { requirePerson } from '#lib/server/actors/tracksForm';
import { currentSuspension } from '#lib/server/moderation/service';
import { isUniqueViolation } from '#lib/server/db-errors';
import {
	canDecline,
	canPostpone,
	laterActive,
	laterUntil,
	parseTarget,
	RULE_LABELS,
	ruleOfKey,
	SUGGESTION_KEY,
	targetLabel,
	targetOf,
	type ChoiceTarget
} from '#lib/career/next';
import { nextActionsFor, type NextOptions, type NextReader } from './next';

export { readChoices } from './next';

export class ChoiceError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

/**
 * Qui choisit : la personne de la session, jamais une identité envoyée par le
 * client. Les actions de formulaire ne passent pas par la garde du layout
 * `(app)` : compte, e-mail vérifié, personne et suspension sont relus ici.
 */
export async function chooserOf(locals: App.Locals) {
	const person = await requirePerson(locals);
	if (await currentSuspension(person.actorId)) error(403, 'Compte suspendu');
	return person;
}

/** Réponse unique à toute clé non proposée : on ne dit pas pourquoi (objet d'autrui ?). */
const UNKNOWN = 'Cette suggestion n’est plus proposée.';

/** Les reports échus ne servent plus à rien : on les oublie. */
function purgeExpired(ownerId: string, now: Date) {
	return prisma.suggestionChoice.deleteMany({
		where: { ownerId, kind: 'LATER', until: { lte: now } }
	});
}

/** La suggestion `key`, si le serveur la propose en ce moment à ce lecteur. */
async function offered(reader: NextReader, key: string, options: NextOptions) {
	if (!SUGGESTION_KEY.test(key) || !ruleOfKey(key)) return null;
	const all = await nextActionsFor(reader, {
		...options,
		scope: 'DETAIL',
		limit: 500,
		perRule: 500,
		maxOptional: 500,
		ignoreChoices: true
	});
	return all.find((s) => s.key === key) ?? null;
}

async function upsertChoice(
	ownerId: string,
	kind: 'LATER' | 'NOT_FOR_ME',
	target: string,
	data: { version: string | null; until: Date | null }
) {
	const where = { ownerId_kind_target: { ownerId, kind, target } };
	try {
		await prisma.suggestionChoice.upsert({
			where,
			create: { ownerId, kind, target, ...data },
			update: data
		});
	} catch (err) {
		// Deux envois simultanés : le second trouve la ligne du premier.
		if (!isUniqueViolation(err, 'target')) throw err;
		await prisma.suggestionChoice.update({ where, data });
	}
}

/** « Plus tard » : 30 jours, ou jusqu'à ce que le fait change. `changed: false` si déjà reportée. */
export async function postpone(reader: NextReader, key: string, options: NextOptions = {}) {
	const now = options.now ?? new Date();
	const s = await offered(reader, key, { ...options, now });
	if (!s || !canPostpone(s)) throw new ChoiceError(UNKNOWN, 404);
	const existing = await prisma.suggestionChoice.findUnique({
		where: { ownerId_kind_target: { ownerId: reader.actorId, kind: 'LATER', target: key } },
		select: { version: true, until: true }
	});
	// Un report en cours sur le même fait n'est ni prolongé ni recréé.
	if (existing && laterActive(existing, s.version, now)) return { changed: false, rule: s.rule };
	await Promise.all([
		upsertChoice(reader.actorId, 'LATER', key, { version: s.version, until: laterUntil(now) }),
		purgeExpired(reader.actorId, now)
	]);
	return { changed: true, rule: s.rule };
}

/** « Pas pour moi » depuis une suggestion affichée : écarte sa règle. */
export async function declineSuggestion(
	reader: NextReader,
	key: string,
	options: NextOptions = {}
) {
	const s = await offered(reader, key, options);
	if (!s || !canDecline(s)) throw new ChoiceError(UNKNOWN, 404);
	return declineTarget(reader.actorId, `rule:${s.rule}`);
}

/** « Pas pour moi » sur une règle ou une branche connue (page des choix). */
export async function declineTarget(ownerId: string, raw: string) {
	const target = parseTarget(raw);
	if (!target) throw new ChoiceError('Ce choix n’existe pas.');
	await upsertChoice(ownerId, 'NOT_FOR_ME', targetOf(target), { version: null, until: null });
	return { label: targetLabel(target) };
}

/** Réactiver : supprime le choix, seulement s'il appartient au lecteur. */
export async function reactivate(ownerId: string, id: string) {
	if (!/^[a-z0-9]{1,40}$/.test(id)) throw new ChoiceError('Ce choix n’existe pas.');
	const { count } = await prisma.suggestionChoice.deleteMany({ where: { id, ownerId } });
	if (count === 0) throw new ChoiceError('Ce choix n’existe pas.', 404);
}

/**
 * Page « Ce que Melokiva me propose » : règles et branches écartées, reports
 * en cours. Aucun titre d'objet : seulement le libellé de la règle et la date,
 * pour ne rien révéler d'un objet dont l'accès aurait changé.
 */
export async function choicesPage(ownerId: string, now = new Date()) {
	await purgeExpired(ownerId, now);
	const rows = await prisma.suggestionChoice.findMany({
		where: { ownerId },
		orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
		select: { id: true, kind: true, target: true, until: true }
	});
	const declined: { id: string; target: ChoiceTarget; label: string }[] = [];
	const later: { id: string; label: string; until: Date }[] = [];
	for (const r of rows) {
		if (r.kind === 'NOT_FOR_ME') {
			const target = parseTarget(r.target);
			// Une cible devenue inconnue (règle retirée) ne s'applique plus : on la tait.
			if (target) declined.push({ id: r.id, target, label: targetLabel(target) });
		} else {
			const rule = ruleOfKey(r.target);
			if (rule && r.until) later.push({ id: r.id, label: RULE_LABELS[rule], until: r.until });
		}
	}
	return { declined, later };
}
