// LINKMUSICIAN (P1-04) : référentiel des genres (D12), sur deux niveaux, chargé
// par `npm run seed:referentiels`. Liste maison en français, inspirée de
// MusicBrainz. Un genre parent se choisit aussi (« Rock » tout court). Pour
// retirer un genre, on le supprime d'ici, et le script le désactive en base.
// Le `slug` ne change jamais une fois publié. Intégrité vérifiée par
// `src/lib/skills/referentials.test.ts`.

/** @type {{ slug: string, name: string, children: [slug: string, name: string][] }[]} */
export const genreTree = [
	{
		slug: 'rock',
		name: 'Rock',
		children: [
			['rock-inde', 'Rock indé'],
			['punk', 'Punk'],
			['post-punk', 'Post-punk / new wave'],
			['garage', 'Garage rock'],
			['grunge', 'Grunge'],
			['hard-rock', 'Hard rock'],
			['rock-progressif', 'Rock progressif'],
			['rock-psychedelique', 'Rock psychédélique'],
			['post-rock', 'Post-rock']
		]
	},
	{
		slug: 'metal',
		name: 'Metal',
		children: [
			['heavy-metal', 'Heavy metal'],
			['thrash-metal', 'Thrash metal'],
			['death-metal', 'Death metal'],
			['black-metal', 'Black metal'],
			['metalcore', 'Metalcore'],
			['doom-metal', 'Doom / sludge'],
			['metal-progressif', 'Metal progressif']
		]
	},
	{
		slug: 'pop',
		name: 'Pop',
		children: [
			['pop-inde', 'Pop indé'],
			['synth-pop', 'Synthpop'],
			['electro-pop', 'Électropop'],
			['pop-urbaine', 'Pop urbaine']
		]
	},
	{
		slug: 'hip-hop',
		name: 'Hip-hop / rap',
		children: [
			['rap-francais', 'Rap français'],
			['boom-bap', 'Boom bap'],
			['trap', 'Trap'],
			['drill', 'Drill'],
			['rap-alternatif', 'Rap alternatif']
		]
	},
	{
		slug: 'soul-funk',
		name: 'R&B / soul / funk',
		children: [
			['rnb', 'R&B'],
			['soul', 'Soul'],
			['neo-soul', 'Néo-soul'],
			['funk', 'Funk'],
			['disco', 'Disco'],
			['gospel', 'Gospel']
		]
	},
	{
		slug: 'jazz',
		name: 'Jazz',
		children: [
			['jazz-manouche', 'Jazz manouche'],
			['bebop', 'Bebop / hard bop'],
			['jazz-vocal', 'Jazz vocal'],
			['big-band', 'Big band / swing'],
			['jazz-fusion', 'Jazz fusion'],
			['latin-jazz', 'Latin jazz'],
			['free-jazz', 'Free jazz']
		]
	},
	{
		slug: 'blues',
		name: 'Blues',
		children: [
			['blues-acoustique', 'Blues acoustique'],
			['blues-electrique', 'Blues électrique'],
			['blues-rock', 'Blues rock']
		]
	},
	{
		slug: 'electro',
		name: 'Électro',
		children: [
			['house', 'House'],
			['techno', 'Techno'],
			['trance', 'Trance'],
			['drum-and-bass', 'Drum and bass'],
			['bass-music', 'Dubstep / bass music'],
			['ambient', 'Ambient'],
			['lo-fi', 'Lo-fi / chill']
		]
	},
	{
		slug: 'reggae',
		name: 'Reggae',
		children: [
			['reggae-roots', 'Reggae roots'],
			['dub', 'Dub'],
			['dancehall', 'Dancehall'],
			['ska', 'Ska']
		]
	},
	{
		slug: 'latin',
		name: 'Musiques latines',
		children: [
			['salsa', 'Salsa'],
			['cumbia', 'Cumbia'],
			['bossa-nova', 'Bossa nova / MPB'],
			['reggaeton', 'Reggaeton'],
			['tango', 'Tango'],
			['flamenco', 'Flamenco']
		]
	},
	{
		slug: 'monde',
		name: 'Musiques du monde',
		children: [
			['afrobeat', 'Afrobeat / afrobeats'],
			['musiques-afrique-ouest', "Musiques d'Afrique de l'Ouest"],
			['rai', 'Raï / musiques orientales'],
			['zouk', 'Zouk / kompa'],
			['celtique', 'Musique celtique'],
			['balkans', 'Musiques des Balkans / klezmer']
		]
	},
	{
		slug: 'chanson',
		name: 'Chanson / variété',
		children: [
			['chanson-francaise', 'Chanson française'],
			['variete', 'Variété'],
			['musette', 'Musette / guinguette']
		]
	},
	{
		slug: 'folk-country',
		name: 'Folk / country',
		children: [
			['folk', 'Folk'],
			['country', 'Country'],
			['bluegrass', 'Bluegrass'],
			['trad', 'Musique traditionnelle / bal folk']
		]
	},
	{
		slug: 'classique',
		name: 'Classique',
		children: [
			['baroque', 'Baroque'],
			['musique-de-chambre', 'Musique de chambre'],
			['symphonique', 'Symphonique'],
			['opera', 'Opéra / lyrique'],
			['contemporain', 'Musique contemporaine']
		]
	},
	{
		slug: 'image-scene',
		name: "Musiques à l'image et de scène",
		children: [
			['musique-de-film', 'Musique de film'],
			['jeu-video', 'Musique de jeu vidéo'],
			['comedie-musicale', 'Comédie musicale']
		]
	}
];
