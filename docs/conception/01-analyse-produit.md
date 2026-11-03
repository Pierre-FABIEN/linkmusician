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

Principe directeur : **ne jamais vendre ce qui fait la crédibilité.**
Pas d'XP, pas de réputation, pas de rang de recherche à acheter. Ce qui
se vend, c'est du confort, de l'outillage et l'accès au signal pour les
professionnels.

| Source                                 | Payeur                                   | Contenu                                                                                                                                | Phase | Risque                                    |
| -------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------- |
| **Abonnement Pro « Scout »**           | Labels, managers, bookers, organisateurs | Recherche avancée multicritère, alertes « projets qui montent », export, annonces illimitées                                           | 5-6   | Faible : c'est la valeur de la plateforme |
| **Annonces professionnelles**          | Organisateurs, studios, labels           | Publier un appel à projets ou un plateau (annonces mises en avant **dans une section dédiée**, jamais mêlées aux résultats organiques) | 5     | Moyen : ne pas polluer la recherche       |
| **Fiche studio étendue / réservation** | Studios                                  | Agenda, réservation, commission sur la réservation (Stripe Connect)                                                                    | 4-5   | Moyen : logistique de paiement            |
| **Premium musicien / groupe**          | Musiciens, groupes                       | Plus de stockage média, statistiques de profil, personnalisation visuelle, kit de presse exportable                                    | 3+    | Faible si purement confort                |
| Partenariats                           | Écoles, fabricants, salles               | Quêtes sponsorisées clairement marquées (« enregistre une reprise, gagne une séance studio »)                                          | 6     | Moyen : éthique de la sponsorisation      |

Exclus : boost de visibilité payant dans la recherche organique, achat
d'XP ou de badges, vente de données.

Le gratuit doit rester complet pour le cœur : profil, recherche, annonces
(avec quota), messagerie, groupes, progression. Le payant n'arrive
qu'en phase 3 au plus tôt. On ne monétise pas un réseau vide.
