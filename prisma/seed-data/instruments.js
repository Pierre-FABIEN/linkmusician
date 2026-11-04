// LINKMUSICIAN (P1-04) : référentiel des instruments, chargé par
// `npm run seed:referentiels`. Liste versionnée : pour retirer un instrument,
// on le supprime d'ici, et le script le désactive en base (jamais de
// suppression). Le `slug` ne change jamais une fois publié.
// L'ordre d'affichage suit l'ordre de chaque famille ci-dessous. Familles et
// libellés : `src/lib/skills/instruments.ts`. Intégrité vérifiée par
// `src/lib/skills/referentials.test.ts`.

/** @type {Record<string, [slug: string, name: string][]>} */
export const instrumentsByFamily = {
	VOICE: [
		['chant', 'Chant'],
		['choeurs', 'Chœurs'],
		['chant-lyrique', 'Chant lyrique'],
		['rap', 'Rap / MC'],
		['beatbox', 'Beatbox']
	],
	PLUCKED_STRINGS: [
		['guitare-electrique', 'Guitare électrique'],
		['guitare-acoustique', 'Guitare acoustique (folk)'],
		['guitare-classique', 'Guitare classique'],
		['basse', 'Basse électrique'],
		['ukulele', 'Ukulélé'],
		['banjo', 'Banjo'],
		['mandoline', 'Mandoline'],
		['harpe', 'Harpe'],
		['lap-steel', 'Lap steel / pedal steel']
	],
	BOWED_STRINGS: [
		['violon', 'Violon'],
		['alto', 'Alto'],
		['violoncelle', 'Violoncelle'],
		['contrebasse', 'Contrebasse']
	],
	KEYBOARDS: [
		['piano', 'Piano'],
		['claviers', 'Claviers / synthétiseur'],
		['piano-electrique', 'Piano électrique (Rhodes, Wurlitzer)'],
		['orgue', 'Orgue'],
		['accordeon', 'Accordéon'],
		['clavecin', 'Clavecin']
	],
	DRUMS_PERCUSSION: [
		['batterie', 'Batterie'],
		['batterie-electronique', 'Batterie électronique'],
		['percussions', 'Percussions'],
		['cajon', 'Cajón'],
		['congas', 'Congas / bongos'],
		['djembe', 'Djembé'],
		['timbales', 'Timbales'],
		['vibraphone', 'Vibraphone / marimba']
	],
	BRASS: [
		['trompette', 'Trompette'],
		['bugle', 'Bugle'],
		['trombone', 'Trombone'],
		['cor', "Cor d'harmonie"],
		['tuba', 'Tuba / soubassophone']
	],
	WOODWINDS: [
		['saxophone-alto', 'Saxophone alto'],
		['saxophone-tenor', 'Saxophone ténor'],
		['saxophone-soprano', 'Saxophone soprano'],
		['saxophone-baryton', 'Saxophone baryton'],
		['flute', 'Flûte traversière'],
		['flute-a-bec', 'Flûte à bec'],
		['clarinette', 'Clarinette'],
		['hautbois', 'Hautbois'],
		['basson', 'Basson'],
		['harmonica', 'Harmonica']
	],
	ELECTRONIC: [
		['dj', 'DJ'],
		['mao', 'MAO / production'],
		['beatmaking', 'Beatmaking / pads (MPC)'],
		['machines', 'Machines / live électronique'],
		['synthe-modulaire', 'Synthétiseur modulaire']
	],
	WORLD: [
		['oud', 'Oud'],
		['bouzouki', 'Bouzouki'],
		['sitar', 'Sitar'],
		['kora', 'Kora'],
		['cavaquinho', 'Cavaquinho'],
		['bandoneon', 'Bandonéon'],
		['tabla', 'Tabla'],
		['balafon', 'Balafon'],
		['steel-drum', 'Steel drum'],
		['cornemuse', 'Cornemuse'],
		['didgeridoo', 'Didgeridoo']
	]
};
