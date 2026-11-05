# 01 — Analyse fonctionnelle et revue critique

## 1. Ce qu'est le produit, en une phrase

Une plateforme où les acteurs de la musique **se trouvent localement,
collaborent réellement, et où chaque collaboration confirmée construit
une trajectoire visible**. Le jeu est le langage qui rend cette
trajectoire lisible. Ce n'est pas un but en soi.

Le test qui distingue ce produit d'un « LinkedIn avec des badges » :
**chaque mécanique de jeu doit pousser vers une interaction musicale
réelle** (répéter, enregistrer, jouer, publier). Si une mécanique peut
être satisfaite sans jamais faire de musique avec quelqu'un, elle est
mal conçue.

## 2. Acteurs et besoins réels

L'interdépendance que décrit le brief est juste. Mais chaque acteur
arrive avec un **besoin immédiat** différent, et c'est ce besoin, pas
l'XP, qui le fait revenir.

| Acteur                | Besoin immédiat (job-to-be-done)               | Ce qu'il apporte aux autres            | Phase |
| --------------------- | ---------------------------------------------- | -------------------------------------- | ----- |
| Musicien              | Trouver des gens près de chez lui pour jouer   | Du talent disponible                   | MVP   |
| Groupe                | Compléter son line-up, trouver des dates       | Des projets qui ont besoin de services | MVP   |
| Producteur / ingé son | Trouver des artistes pour son portfolio        | Enregistrement, mixage                 | 4     |
| Studio                | Remplir ses créneaux                           | Des lieux, du matériel                 | 4     |
| Organisateur / salle  | Programmer des groupes fiables                 | Des dates, donc des preuves de live    | 5     |
| Manager / booker      | Repérer des projets qui avancent               | De l'accompagnement                    | 5     |
| Label / éditeur       | Repérer des artistes avec une traction prouvée | Signatures, sorties                    | 6     |

Conséquence : **les professionnels sont des consommateurs de signal.**
Ils ne viendront que lorsque la plateforme contiendra des trajectoires
crédibles. On les fait donc entrer dans l'ordre où ils peuvent
_produire_ de la preuve pour les autres : le studio prouve
l'enregistrement, l'organisateur prouve le concert, le label prouve la
signature.

## 3. Périmètre fonctionnel par domaine

Les domaines fonctionnels sont détaillés dans
[03-architecture.md §1](./03-architecture.md#1-architecture-fonctionnelle).
Les fonctions du brief y sont toutes, regroupées en 12 domaines.
Ajouts au brief :

- **Annonces / quêtes ouvertes** : « Groupe X cherche bassiste rock,
  Lyon, 25 km ». C'est l'objet central de la mise en relation, plus utile
  qu'une recherche libre de profils, parce qu'il exprime une intention.
- **Collaboration comme objet de première classe**, avec un cycle de vie
  (proposée → acceptée → en cours → terminée et confirmée). C'est elle
  qui produit la réputation.
- **Confiance (trust level)** interne : quotas d'envoi de messages,
  droit de publier des annonces, droit d'endosser quelqu'un.
- **Sécurité des personnes** : blocage, masquage, signalement, protection
  des mineurs, et aucune localisation précise stockée.

## 4. Incohérences et fonctionnalités contre-productives du brief

Chaque ligne indique ce que dit le brief, pourquoi ça pose problème et
ce que je propose à la place.

### 4.1 Contradictions internes

| Le brief dit                                                                                                                              | Problème                                                                                                                       | Alternative                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Les niveaux ne garantissent jamais la compétence » **et** « niveau avancé → être recommandé aux producteurs, découvert par les labels » | Si le niveau ouvre l'accès aux pros, tout le monde le lira comme un gage de compétence, et c'est lui qu'on cherchera à farmer. | La découverte par les pros repose sur la **réputation** et les **étapes vérifiées**, jamais sur l'XP. L'XP ne sert qu'à la motivation et au cosmétique.                                                                                   |
| « Contacter un musicien » rapporte de l'XP **et** « prévenir le spam de contacts »                                                        | Les deux s'excluent : on paie exactement le comportement qu'on veut limiter.                                                   | 0 XP pour un contact. De l'XP quand le contact **aboutit** (réponse, puis collaboration confirmée).                                                                                                                                       |
| « Créer et administrer des groupes » au niveau intermédiaire                                                                              | Un groupe existant qui s'inscrit ne peut pas créer sa page. Il repart.                                                         | Création libre dès le premier jour. Ce qui monte avec la confiance : le nombre d'annonces actives et les invitations par jour.                                                                                                            |
| « Privilégier les interactions réelles » **et** fil d'actualité avec likes et commentaires                                                | Un fil social coûte cher à modérer et pousse vers l'interaction superficielle, celle qu'on veut éviter.                        | Pas de fil généraliste au MVP. Un **journal d'activité** (étapes franchies, collaborations) des profils suivis, sans likes. Les commentaires viendront plus tard, sur les médias.                                                         |
| Les étapes doivent être « vérifiables »                                                                                                   | La plupart ne le sont pas (« première répétition », « première composition »).                                                 | Vérification **proportionnelle** : les étapes invérifiables restent déclaratives et rapportent peu. Les étapes à fort enjeu (concert, sortie, signature) exigent une preuve. Voir [02 §4](./02-progression.md#4-preuves-et-vérification). |

### 4.2 Risques de conception

1. **Démarrage à froid (le risque n°1).** Un réseau de proximité vaut
   zéro tant qu'il n'y a personne dans un rayon de 20 km. Sept types
   d'acteurs au lancement, c'est sept marchés vides. → Une zone, deux
   types d'acteurs, amorçage manuel (écoles, salles de répétition,
   disquaires), et des annonces importables ou saisies par l'équipe au
   départ.
2. **Niveau d'instrument auto-déclaré.** Sur une échelle « débutant /
   avancé », tout le monde se dit avancé. → Une échelle à **descripteurs
   observables** (par exemple « je tiens un set de 45 min en groupe »),
   une démo attachée, et des endossements réservés aux personnes ayant
   **réellement collaboré** avec vous.
3. **Collusion.** Deux comptes, ou cinq amis, qui se confirment
   mutuellement des collaborations fictives. → Rendements décroissants
   par contrepartie, pondération par la confiance de la contrepartie,
   détection des cliques, reprise d'XP. Voir
   [02 §6](./02-progression.md#6-anti-abus).
4. **Contacts entre adultes et mineurs.** Une population musicienne
   compte beaucoup d'adolescents. → Âge minimum de 16 ans au MVP (D5),
   messagerie restreinte pour les 16-17 ans (pas de premier message d'un
   adulte inconnu hors annonce), signalement visible partout.
5. **Localisation.** Afficher « à 2,3 km » permet de trianguler un
   domicile en trois requêtes. → On ne stocke **jamais** de point précis.
   On garde un centroïde de commune ou une grille d'environ 2 km, et on
   affiche des distances arrondies par tranches.
6. **Membres qui quittent un groupe.** À qui reviennent l'XP et les
   succès ? → Au groupe. Le membre garde ses propres succès individuels,
   et l'historique des adhésions (avec dates) attribue chaque étape aux
   membres présents à ce moment-là.
7. **Une personne, plusieurs casquettes.** Guitariste et producteur, ou
   manager de son propre groupe. → Un compte = une **Personne** avec
   plusieurs **pistes de métier**. Les groupes, studios et labels sont des
   **Organisations** distinctes, rattachées par adhésion. Voir
   [04](./04-modele-donnees.md).
8. **Coût des médias.** La vidéo coûte cher en stockage et en
   transcodage. → Quotas par confiance, durée maximale par clip, upload
   direct signé vers Cloudinary (le boilerplate passe actuellement les
   images par le serveur, avec une limite de 5 Mo, inadapté à la vidéo).

### 4.3 Fonctionnalités à ne pas construire, ou pas maintenant

- **Classements régionaux par XP** : ils récompensent le grind et
  opposent des voisins. Si on en fait, ce seront des défis collectifs
  (« les groupes de Lyon ont joué 40 concerts ce mois-ci »).
- **Saisons avec récompenses** : elles créent de la pression à l'activité
  artificielle. Peut-être en phase 6, sous forme de défis créatifs
  (« compose en 30 jours »).
- **Notes publiques en étoiles entre musiciens** : représailles, faux
  avis, contentieux. On préfère des **endossements positifs ciblés**
  (« fiable », « ponctuel », « bonne oreille ») et des signalements
  privés pour le négatif.
- **Majors comme utilisateurs actifs** : irréaliste à moyen terme. Les
  labels indépendants et les éditeurs locaux sont la vraie cible de la
  phase 6.

## 5. Modèle économique

> Révisé le 05/11/2026 (D25) à partir d'une étude de plateformes
> comparables (sources en fin de section). Les chiffres sont des repères
> publics, parfois anciens ou contradictoires : à revérifier avant de
> fixer un prix.

Principe directeur, inchangé : **ne jamais vendre ce qui fait la
crédibilité.** Pas d'XP, pas de réputation, pas de rang de recherche, pas
de place dans le mode jam à acheter. Ce qui se vend : des **prestations
réelles** (commission), de l'**outillage** pour ceux qui en tirent un
revenu, et du **confort ou du cosmétique** de jeu.

### 5.1 Ce que font les plateformes comparables

| Modèle                     | Exemple                            | Repères trouvés                                                                                    |
| -------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| Abonnement musicien        | BandMix (mise en relation)         | 12,95 $/mois ou 99,95 $/an, messagerie réservée aux payants                                        |
| Abonnement musicien        | Vampr (« LinkedIn des musiciens ») | Pro ~5 $/mois ; 3 à 4 % des actifs paient                                                          |
| Freemium gamifié           | Strava                             | ~80 $/an ; 2 à 8 % de payants selon les estimations ; ~90 % du chiffre d'affaires par l'abonnement |
| Freemium gamifié           | Duolingo                           | ~9 % des utilisateurs mensuels paient (12,2 M sur 133 M fin 2025)                                  |
| Commission sur prestations | GigSalad (concerts privés)         | 2,5 à 5 % côté artiste + 4 à 8 % côté client, prélevés seulement si la date est réservée           |
| Commission sur prestations | SoundBetter (production, ingé son) | 5 à 10 % selon les années                                                                          |
| Commission sur prestations | Malt (freelances, France)          | 10 %, 5 % après 6 mois de relation, 2 % si le freelance a apporté son client                       |
| Accès payant aux pros      | Groover                            | ~2 € par envoi, moitié reversée au pro, réponse garantie ; modèle très critiqué                    |
| Outils pour les lieux      | Bandsintown Pro (salles)           | abonnement au prix fonction de la taille de la salle                                               |

Marché : 11 % des Français déclaraient une pratique musicale en amateur
en 2018 (environ 6 millions de personnes), et **deux tiers de ceux qui
ont joué ont arrêté**. Aider à continuer de jouer avec d'autres est la
raison d'être de l'app, et ce qui la rendra rentable.

### 5.2 Les sources de revenus, dans l'ordre

| #   | Source                         | Payeur                                      | Contenu                                                                                                                                                                                        | Repère de prix                                                                                   | Phase |
| --- | ------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----- |
| 1   | **Commission sur prestations** | Surtout l'acheteur                          | Cours, sessions studio, ingé son, production, réservation de studio, puis concerts privés. La prestation confirmée est aussi une preuve (points, réputation)                                   | 5 à 8 % de frais de service, peu ou rien côté musicien ; dégressif avec la fidélité (comme Malt) | 4-5   |
| 2   | **Abonnements outils**         | Lieux, puis pros                            | **Lieux** (bars, salles, MJC) : agenda, appels à groupes, jams publiques, aide licence et GUSO. **Pros** (« Scout ») : recherche avancée, alertes « projets qui montent », annonces illimitées | Lieux 15 à 50 €/mois selon la taille ; pros 30 à 100 €/mois                                      | 5     |
| 3   | **LinkMusician+** (musiciens)  | Musiciens, groupes                          | Statistiques de profil, stockage, kit presse exportable, **cosmétiques de jeu** (cadres, thèmes, titres). Jamais de pouvoir                                                                    | ~4,99 €/mois ou 39 €/an                                                                          | 3-4   |
| 4   | **Partenariats**               | Fabricants, écoles, magasins, distributeurs | Défis et quêtes sponsorisés **clairement marqués** ; affiliation (distribution numérique, assurance d'instruments)                                                                             | au contrat                                                                                       | 6     |

Ordre de grandeur pour la source 3 : 20 000 musiciens actifs × 4 % ×
39 € ≈ 31 000 € par an. Utile, mais insuffisant seul : d'où l'ordre
ci-dessus, qui fait payer d'abord ceux qui gagnent de l'argent grâce à
la plateforme.

**Financements publics** (pas un revenu, mais réaliste au démarrage) :
la pratique amateur et la scène locale relèvent de la politique
culturelle (Centre national de la musique, régions, Bpifrance pour
l'innovation).

### 5.3 Ce qu'on refuse

| Refusé                                               | Pourquoi                                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Messagerie payante (comme BandMix)                   | Elle tue les rencontres, donc la valeur de l'app                                         |
| Boost de visibilité dans la recherche ou le mode jam | Les pros doivent découvrir les gens par ce qu'ils ont prouvé, pas par ce qu'ils ont payé |
| Payer pour être écouté par un pro (comme Groover)    | Rapporte, mais exploite l'espoir des artistes et contredit le principe ci-dessus         |
| Achat d'XP, de badges, de rangs ; vente de données   | Détruit la crédibilité des preuves et la confiance                                       |

### 5.4 Points de vigilance

- **Juridique (à faire valider par un juriste avant la source 1)** : en
  France, un artiste payé pour se produire est présumé salarié (cachets ;
  GUSO pour un organisateur occasionnel). La commission est simple sur
  les **cours, le studio, l'ingé son et la production**, souvent facturés
  par des indépendants ; elle est plus délicate sur les **concerts**, qui
  demanderaient de passer par le GUSO ou un partenaire de portage.
- **Pas de monétisation d'un réseau vide** : le gratuit reste complet
  (profil, recherche, annonces avec quota, messagerie, mode jam, groupes,
  progression). Le payant n'arrive que quand les indicateurs (P1-13)
  montrent que les gens reviennent.
- **Paiements** : Stripe Connect (déjà dans le socle) pour les
  commissions ; la boutique en veille reste séparée.

### 5.5 Sources

- [BandMix – abonnement Premier](https://echomedia.freshdesk.com/support/solutions/articles/2100041066-how-do-i-become-a-premier-member-)
- [Vampr, conversion (Music Business Worldwide)](https://www.musicbusinessworldwide.com/jaxsta-acquires-linkedin-for-creatives-vampr1/)
- [Strava (IPOX)](https://www.ipox.com/ipox/ipox-watch-strava) · [Strava (Sacra)](https://sacra.com/c/strava/)
- [Duolingo, chiffres 2025 (Motley Fool)](https://www.fool.com/investing/2026/02/16/3-key-takeaways-from-duolingos-2025)
- [GigSalad – frais](https://www.gigsalad.com/join) · [GigSalad – concerts privés (Hypebot)](https://www.hypebot.com/tag/gigsalad/)
- [SoundBetter (Music Gateway)](https://www.musicgateway.com/blog/how-to/soundbetter-review)
- [Malt, commissions (Keobiz)](https://www.keobiz.fr/fiches-pratiques/lancer-activite-freelance/plateformes-pour-freelances-malt/)
- [Groover (TechCrunch)](https://techcrunch.com/2024/02/17/groover-independent-artists-song-discovery) · [Groover, prix](https://help.groover.co/en/articles/2966389-do-i-have-to-pay-to-use-groover)
- [Bandsintown Pro pour les lieux](https://help.venues.bandsintown.com/en/articles/8487058-how-much-does-it-cost)
- [Ministère de la Culture – pratique musicale amateur](https://www.culture.gouv.fr/actualites/special-fete-de-la-musique-2-une-pratique-amateur-en-constante-mutation)
- [INSEE – pratiques amateurs 2018](https://www.insee.fr/fr/statistiques/6535287)
