/** Ingé son (ONB-04) : prestations, besoins et champs propres. */
import { intent, opt, STUDIO_ENVIRONMENTS } from './helpers';
import type { TrackCatalog } from './types';

const LIVE = ['LIVE_FOH', 'LIVE_MONITORS'];
const STUDIO_WORK = [
	'RECORDING',
	'MIXING',
	'MASTERING',
	'EDITING_RESTORATION',
	'SOUND_DESIGN',
	'POSTPRODUCTION'
];

export const soundCatalog: TrackCatalog = {
	offers: [
		intent(
			'RECORDING_SERVICE',
			'Enregistrer',
			'Prendre le son de tes séances, en studio ou ailleurs.'
		),
		intent('MIXING_SERVICE', 'Mixer', 'Mixer des titres, des EP, des albums.'),
		intent('MASTERING_SERVICE', 'Masteriser', 'Finaliser des titres pour leur diffusion.'),
		intent('LIVE_FOH_SERVICE', 'Sonoriser des concerts', 'Tenir la façade d’un concert.'),
		intent('LIVE_MONITORS_SERVICE', 'Faire les retours', 'Tenir les retours d’un concert.'),
		intent(
			'EDITING_SERVICE',
			'Éditer, restaurer',
			'Nettoyer, monter, restaurer des enregistrements.'
		),
		intent(
			'SOUND_DESIGN_SERVICE',
			'Créer des sons',
			'Sound design pour l’image, le jeu, la scène.'
		),
		intent(
			'POSTPRODUCTION_SERVICE',
			'Faire de la postproduction',
			'Monter, mixer et livrer le son d’un film, d’une série, d’une pub.'
		),
		intent('TRAINING', 'Transmettre', 'Former, accompagner d’autres techniciens.')
	],
	needs: [
		intent('FIND_ARTISTS', 'Des artistes', 'Des artistes à enregistrer, mixer ou sonoriser.'),
		intent(
			'FIND_BANDS',
			'Des groupes',
			'Des groupes qui cherchent un son, sur scène ou en studio.'
		),
		intent('FIND_SESSIONS', 'Des sessions', 'Des séances d’enregistrement à tenir.'),
		intent('FIND_STUDIOS', 'Un studio, un collectif', 'Un lieu ou une équipe où travailler.'),
		intent('FIND_LIVE_DATES', 'Des dates live', 'Des concerts à sonoriser.'),
		intent(
			'FIND_COLLABORATORS',
			'Des collaborateurs',
			'Des ingés, des producteur·rices avec qui travailler.'
		)
	],
	fields: [
		{
			id: 'environment',
			label: 'Où tu travailles',
			kind: 'multi',
			required: true,
			options: [
				...STUDIO_ENVIRONMENTS,
				opt('CLIENT_PLACE', 'Chez le client'),
				opt('LIVE', 'En live')
			]
		},
		{
			id: 'daw',
			label: 'Ton logiciel principal (DAW)',
			kind: 'single',
			when: { specializations: STUDIO_WORK },
			options: [
				opt('PRO_TOOLS', 'Pro Tools'),
				opt('LOGIC', 'Logic Pro'),
				opt('ABLETON', 'Ableton Live'),
				opt('CUBASE', 'Cubase'),
				opt('REAPER', 'Reaper'),
				opt('STUDIO_ONE', 'Studio One'),
				opt('OTHER', 'Autre')
			]
		},
		{
			id: 'mixing_format',
			label: 'Mixage : formats',
			kind: 'multi',
			when: { specializations: ['MIXING'] },
			options: [opt('STEREO', 'Stéréo'), opt('IMMERSIVE', 'Immersif (Atmos, binaural)')]
		},
		{
			id: 'mixing_revisions',
			block: 'conditions',
			label: 'Mixage : révisions',
			kind: 'single',
			when: { specializations: ['MIXING'] },
			options: [opt('INCLUDED', 'Incluses (nombre fixé)'), opt('ON_QUOTE', 'Sur devis')]
		},
		{
			id: 'mastering_targets',
			label: 'Mastering : destinations',
			kind: 'multi',
			when: { specializations: ['MASTERING'] },
			options: [
				opt('STREAMING', 'Streaming'),
				opt('CD', 'CD'),
				opt('VINYL', 'Vinyle'),
				opt('BROADCAST', 'Radio, télévision')
			]
		},
		{
			id: 'mastering_deliverables',
			label: 'Mastering : livrables',
			kind: 'multi',
			when: { specializations: ['MASTERING'] },
			options: [
				opt('WAV_HIRES', 'WAV haute résolution'),
				opt('DDP', 'DDP'),
				opt('STEMS', 'Stems'),
				opt('MP3', 'MP3')
			]
		},
		{
			id: 'recording_sources',
			label: 'Enregistrement : ce que tu prends',
			kind: 'multi',
			when: { specializations: ['RECORDING'] },
			options: [
				opt('VOICES', 'Voix'),
				opt('INSTRUMENTS', 'Instruments'),
				opt('DRUMS', 'Batterie'),
				opt('ENSEMBLES', 'Ensembles acoustiques'),
				opt('FIELD', 'Prise de son extérieure')
			]
		},
		{
			id: 'live_venues',
			label: 'Live : types de scène',
			kind: 'multi',
			when: { specializations: LIVE },
			options: [
				opt('BAR', 'Bar'),
				opt('CLUB', 'Club'),
				opt('VENUE', 'Salle'),
				opt('FESTIVAL', 'Festival'),
				opt('OUTDOOR', 'Plein air')
			]
		},
		{
			id: 'live_capacity',
			label: 'Live : plus grande jauge tenue',
			kind: 'single',
			when: { specializations: LIVE },
			options: [
				opt('UNDER_100', 'Moins de 100'),
				opt('UP_TO_500', '100 à 500'),
				opt('UP_TO_2000', '500 à 2 000'),
				opt('OVER_2000', 'Plus de 2 000')
			]
		},
		{
			id: 'live_consoles',
			label: 'Live : consoles maîtrisées',
			kind: 'multi',
			when: { specializations: LIVE },
			options: [
				opt('ANALOG', 'Analogiques'),
				opt('YAMAHA', 'Yamaha'),
				opt('ALLEN_HEATH', 'Allen & Heath'),
				opt('MIDAS', 'Midas, Behringer'),
				opt('DIGICO', 'DiGiCo'),
				opt('SOUNDCRAFT', 'Soundcraft'),
				opt('OTHER', 'Autres')
			]
		},
		{
			id: 'rf_contexts',
			label: 'HF, broadcast : contextes',
			kind: 'multi',
			when: { specializations: ['RF', 'BROADCAST'] },
			options: [
				opt('CONCERTS', 'Concerts'),
				opt('TV', 'Télévision'),
				opt('RADIO', 'Radio'),
				opt('LIVE_STREAM', 'Diffusion en direct'),
				opt('EVENTS', 'Événements')
			]
		}
	]
};
