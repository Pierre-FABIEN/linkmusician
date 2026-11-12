# 05 — Onboarding, MVP et roadmap

## 1. Onboarding

Objectif mesurable : **voir 5 profils ou annonces pertinents à proximité
en moins de 2 minutes après l'inscription.** Toute étape qui ne sert pas
cet objectif est optionnelle, ou repoussée en quête.

| #   | Écran                | Contenu                                                                                                               | Obligatoire |
| --- | -------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Inscription          | Email + mot de passe ou Google (existant), **date de naissance** (refus sous 16 ans)                                  | ✅          |
| 2   | « Qui es-tu ? »      | Pistes : musicien (MVP). Producteur, studio, etc. affichés « bientôt », avec inscription sur liste d'attente          | ✅          |
| 3   | Instruments          | 1 à 3 instruments, niveau sur l'échelle à descripteurs (pas d'adjectifs nus)                                          | ✅ ≥1       |
| 4   | Genres               | 1 à 5 genres, plus des influences libres                                                                              | ✅ ≥1       |
| 5   | Zone                 | Code postal ou commune (**jamais de géolocalisation GPS**), rayon de déplacement (10/20/50 km)                        | ✅          |
| 6   | Intention            | « Je cherche… » : un groupe, des musiciens pour mon groupe, des jams, juste explorer. Cela oriente la première page   | ✅          |
| 7   | **Premier résultat** | Annonces et profils proches correspondant à l'intention, et la carte de progression qui montre les 3 premières quêtes | —           |

**Parcours adaptatif (ONB-02, D57).** Les écrans dépendent des métiers
choisis, d'après la fiche de chaque métier (`TRACK_ROLES`,
`src/lib/actors/roles.ts`) :

```
Qui es-tu ? → [Instruments si musicien·ne] → Genres → Zone
           → un écran par autre métier (le principal d'abord)
           → [Intention si musicien·ne] → Récapitulatif → Premier résultat
```

- Musicien·ne seul·e : les 6 écrans ci-dessus, plus le récapitulatif.
  Aucun autre métier ne demande d'instrument.
- **Récapitulatif (ONB-12a, D60)** : une section par écran rempli, avec
  « Modifier » qui y ramène. Tout est déjà enregistré à chaque écran : une
  correction ne perd rien, et ramène directement au récapitulatif (sauf
  métier ajouté en route, dont l'écran vient d'abord). Le valider termine
  l'onboarding (`Person.onboardedAt`), pour tous les métiers.
- Genres et zone sont communs : demandés une fois, quel que soit le
  nombre de métiers (Q56).
- Écran d'un métier : ses spécialités (au moins une pour un métier
  ouvert, facultatives pour un métier « bientôt », Q57), puis « Je
  propose » et « Je recherche » quand ses catalogues existent (ONB-03 à
  11). Le valider pose `PersonTrack.detailsConfirmedAt`.
- L'étape courante est la première qui manque vraiment : une reprise, un
  retour arrière ou un métier ajouté en cours de route y ramènent. Une
  étape future est refusée au chargement comme à l'enregistrement.
- Le premier résultat montre les objectifs du métier principal quand ce
  n'est pas musicien·ne (Q58).

Après l'onboarding, des quêtes système guident la suite : ajouter une
démo (+30 XP), compléter sa bio (comptée dans « profil complété », +50),
répondre à une annonce, rejoindre ou créer son groupe.

**Amélioration proposée (D47, non acceptée)** : ajouter dans les écrans
existants une aide facultative qui transforme une description libre en
propositions pour les champs d'inscription. Elle ne crée pas de nouvel
écran et ne remplace pas le choix manuel, les référentiels ni les
validations. Le texte ne doit pas être conservé ; le fournisseur et ses
garanties de confidentialité restent à décider. Voir [P3-17](../plan/README.md).

**État vide** : si moins de 5 résultats dans le rayon, on le dit
honnêtement (« tu es parmi les premiers à Annecy »). On propose
d'élargir le rayon et un lien d'invitation, et on s'abonne à une alerte
« nouveaux musiciens près de chez toi ».

## 2. Stratégie MVP

### Hypothèse à valider

> Des musiciens d'une même zone utilisent la plateforme pour **former
> ou compléter un groupe**, et la progression visible les fait revenir
> après la mise en relation.

Indicateurs de validation (sur 3 mois, dans la zone de lancement) :

- ≥30 % des inscrits ont une **conversation réciproque** dans les 14 jours.
- ≥10 % ont une **collaboration confirmée** ou une **adhésion de groupe**
  dans les 60 jours.
- Rétention à 30 jours ≥25 % chez ceux qui ont franchi le palier « En
  réseau ».
- Moins de 2 % des comptes signalés pour spam.

### Inclus dans le MVP (phases 0 à 3)

Profils musicien, instruments et genres, zone floutée, démos (audio,
vidéo, liens), recherche géographique, annonces de recrutement et de jam,
candidatures, messagerie (polling), collaborations confirmées des deux
côtés, groupes avec adhésions, étapes de groupe 1 à 6 (concert au plus
« corroboré », puisque les organisateurs n'arrivent qu'en phase 5),
registre XP, niveau de compte, paliers musicien et groupe, succès,
confiance, carte de réputation, notifications in-app et email,
signalements et modération admin, export et suppression RGPD.

### Exclu du MVP, et pourquoi

| Exclu                                       | Raison                                                   |
| ------------------------------------------- | -------------------------------------------------------- |
| Producteurs, studios, labels, organisateurs | Démarrage à froid : un seul marché à amorcer             |
| Fil d'actualité, likes, commentaires        | Coût de modération, pousse à l'interaction superficielle |
| Classements, saisons                        | Contre-productifs pour la collaboration (voir 01 §4.3)   |
| Temps réel WebSocket                        | Le polling suffit pour de la mise en relation            |
| Paiements                                   | On ne monétise pas un réseau vide                        |
| Application mobile native                   | Une web app responsive (PWA) suffit au MVP               |

## 3. Roadmap

Chaque phase est livrable et utilisable seule. Les critères
d'acceptation sont vérifiables par un test automatisé ou une mesure.

### Phase 0 — Préparer le socle _(≈1 semaine)_

- **Décisions** : D6 (on garde tous les modules, la boutique est mise en
  veille), D10 (on garde l'historique de migrations), nom et handle du
  produit (D9), zone de lancement (D4).
- **Travail** : interrupteur `SHOP_ENABLED` et garde des routes de
  boutique, base Neon dédiée avec PostGIS, rôle `MODERATOR`, coquille
  `(app)`, procédure de synchro avec le boilerplate.
- **Dépendances** : aucune.
- **Acceptation** : `check`, `lint`, `test:unit` et toute la suite e2e du
  boilerplate (boutique activée en e2e) au vert. Boutique coupée :
  `/products` renvoie une 404 et aucun lien de boutique n'est visible.
  Les modifications des fichiers du boilerplate sont toutes marquées
  `LINKMUSICIAN:`.
- **Tests** : suite e2e existante sans régression, plus
  `e2e/linkmusician/shop-off.spec.ts`.

### Phase 1 — Identité musicale et moteur de progression _(≈3-4 semaines)_

- **Décisions** : barème XP v1 (02 §2), échelle de niveau d'instrument
  (libellés exacts), référentiels instruments et genres (sources, langue).
- **Travail** : `Actor`, `Person`, `PersonTrack`, `PersonInstrument`,
  genres, `ActorLocation`, `Media` (upload direct signé), onboarding,
  profil public `@handle`, `DomainEvent`, `XpTransaction`,
  `ActorProgress`, succès, confiance TL0-1, `Report`. Le **noyau pur de
  progression** est développé et testé en premier.
- **Dépendances** : phase 0.
- **Acceptation** :
  - Un nouvel inscrit termine l'onboarding en ≤6 écrans (plus le
    récapitulatif, ONB-12a) et voit son
    niveau, sa barre d'XP et 3 quêtes.
  - Rejouer le registre reconstruit exactement `ActorProgress` (test de
    cohérence).
  - Rejouer un même `DomainEvent` ne crédite pas deux fois.
  - Aucune route n'accepte de champ `xp`, `level`, `tier` ou
    `trustLevel` (test qui énumère les schémas Zod).
  - Un média n'est public qu'au statut `PUBLISHED`.
  - Une inscription avec une date de naissance de moins de 16 ans est
    refusée.
- **Tests** : unitaires par table sur `progression/core` (règles,
  courbe, paliers, multiplicateurs). Intégration ledger et projecteur
  (Postgres de test). E2E sur l'onboarding complet et le profil public.
  Unitaires sur le floutage de zone (aucun point en sortie n'est à moins
  de _x_ m de l'entrée réelle).

### Phase 2 — Découverte, annonces, messagerie, collaborations _(≈4 semaines)_

- **Décisions** : règles de tri de la recherche (part de la réputation et
  de la proximité), quotas de confiance, texte de l'échelle d'arrondi des
  distances.
- **Travail** : recherche PostGIS et filtres (instrument, niveau, genre,
  distance, disponibilité, type de collaboration), `Opportunity` et
  `Application`, conversations (demande puis acceptation), blocage,
  `Collaboration` avec double confirmation, endossements, réputation
  (job), multiplicateurs anti-collusion, notifications in-app et email,
  confiance TL2.
- **Dépendances** : phase 1.
- **Acceptation** :
  - « Guitariste à moins de 20 km » ne renvoie que des profils dont la
    zone floutée est dans le rayon. La distance affichée est une tranche,
    jamais une valeur exacte.
  - Une 2ᵉ collaboration avec la même contrepartie rapporte 50 %, la
    4ᵉ rapporte 0.
  - Un TL0 ne peut pas envoyer plus de 10 premiers messages par jour
    (429 au 11ᵉ).
  - Un endossement est impossible sans collaboration confirmée commune.
  - Un utilisateur bloqué ne peut ni écrire ni voir le profil.
- **Tests** : intégration des requêtes géographiques avec jeu de données
  connu. Unitaires sur les multiplicateurs. E2E « annonce → candidature
  → conversation → collaboration confirmée → XP créditée des deux
  côtés ». Test k6 de la recherche (le dossier `k6/` existe déjà).

### Phase 3 — Groupes, étapes et preuves _(≈3-4 semaines)_ → **fin du MVP**

- **Décisions** : liste finale des étapes et preuves recevables, qui peut
  corroborer quoi, processus de contestation.
- **Travail** : `Organization` (BAND), `Membership` avec historique,
  page de groupe, annonces « cherche un membre », `MilestoneDefinition`,
  `Milestone`, `Evidence`, `Attestation`, paliers de groupe, part d'XP
  aux membres présents, contestations et reprise d'XP, vérification de
  sortie par API (Spotify ou MusicBrainz), écrans de modération admin,
  extension de l'export et de l'anonymisation RGPD. Le
  morceau minimal (`Work`, contributeurs, maquette, D35), base des étapes
  de composition et d'enregistrement ([06 §4](./06-metiers.md#4-la-chaîne-dun-morceau--du-jam-au-producteur)).
- **Dépendances** : phase 2 (annonces, collaborations).
- **Acceptation** :
  - Un concert corroboré uniquement par un membre du groupe reste
    `DECLARED`.
  - Une contestation retenue écrit une transaction négative liée
    (`reversesId`) et rétrograde la confiance de l'attestant.
  - Un membre arrivé après une étape n'en reçoit pas la part d'XP.
  - Un compte supprimé laisse les collaborations de ses contreparties
    intactes, affichées « Compte supprimé ».
- **Tests** : unitaires sur les règles de preuve. Intégration de la
  contestation et de la reprise. E2E du parcours d'un groupe, de la
  formation au premier concert corroboré. E2E d'export RGPD.

**Pas de bêta (D23)** : le MVP s'ouvre directement au public à la fin de
la phase 3 (lot P3-10). **Point d'étape après 3 mois d'usage réel** sur
les indicateurs du §2.

### Phase 4 — Producteurs, studios, temps réel

Pistes `PRODUCER` et `SOUND_ENGINEER`, organisation `STUDIO` (matériel,
tarifs, créneaux), annonces ciblées par métier, collaborations de
production et d'enregistrement **liées au morceau** (qui **vérifient**
les étapes 2 et 4 des groupes), crédits sur les morceaux, vitrine des
**propositions** de morceaux ouverte aux producteurs (D20,
[06 §4](./06-metiers.md#4-la-chaîne-dun-morceau--du-jam-au-producteur)), messagerie temps réel (Ably ou Pusher), premium musicien et
groupe (confort uniquement).

### Phase 5 — Organisateurs, managers, bookers, monétisation pro

Organisations `PROMOTER`, `MANAGEMENT` et _(proposé, D22)_ `VENUE` (bars,
cafés-concerts, salles, MJC : dates et jams publiques visibles dans le
mode jam), **organisations vérifiées**
(SIRET), annonces « plateau » et appels à projets avec conditions
d'éligibilité, vérification des concerts (étapes 6 et 7 au niveau
`VERIFIED`), abonnement Scout, réservation de studio avec Stripe Connect.

### Phase 6 — Labels, éditeurs, défis

Organisations `LABEL` et `PUBLISHER`, signatures vérifiées, flux
« projets qui montent », défis collectifs opt-in (D3), fil d'activité
enrichi si les indicateurs de modération le permettent, quêtes
sponsorisées.

## 4. Passage à l'exécution

Cette roadmap fixe le **contenu** et les **critères d'acceptation** de
chaque phase. Le découpage en lots, l'ordre de travail et le suivi sont
dans le [plan d'exécution](../plan/README.md). En cas de divergence,
c'est ce document qui fait foi pour les critères et le plan pour
l'ordre.
