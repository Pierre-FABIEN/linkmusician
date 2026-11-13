# Navigation globale et métier actif — DASH-01 (#31)

Référence : [issue #31](https://github.com/Pierre-FABIEN/linkmusician/issues/31),
épopée [#30](https://github.com/Pierre-FABIEN/linkmusician/issues/30).
Implémentation du 12/11/2026, sur les écrans et services déjà livrés.

## Parcours

- `/jouer` reste l'accueil global Metro à quatre pivots. Le choix Jam/Carrière,
  les présentations et la préférence de mode sont conservés.
- La coquille conserve les **icônes en haut à droite** : Découvrir, Messages,
  Notifications et Aide (cette dernière se replie sur téléphone). Les compteurs
  restent sur les icônes. La ligne textuelle Accueil/Découvrir/Annonces/Messages/Profil
  ajoutée dans DASH-01 est retirée à la demande produit du 13/11/2026.
  L'accueil reste accessible par la marque et le compte garde son accès au profil.
- Un sélecteur compact **Rôle : …**, placé à côté des icônes, choisit l'un
  des métiers réellement détenus ; changer la sélection bascule aussitôt
  (sans JavaScript, un bouton **Changer de rôle** prend le relais). Il
  n'apparaît que si la personne détient au moins deux métiers. `/espace`
  s'ouvre depuis le menu du compte (**Mon espace**). Le métier
  principal reste celui choisi dans les réglages : changer de contexte
  ne modifie pas le profil.
- Une icône soleil/lune, à côté des raccourcis, bascule entre les modes
  clair et sombre ; le choix est mémorisé sur l'appareil.
- `/espace` garde le parcours musical pour Musicien·ne ; les autres métiers
  affichent un menu propre, composé de liens vers les écrans existants.
  Les objectifs du métier actif passent en premier sur l'écran des objectifs.
- Sur une recherche, changer de contexte conserve l'URL, ses filtres et son
  fragment. Les filtres de métier de Découvrir désignent les **personnes
  recherchées**, pas le métier actif de la personne qui cherche.
- Sur une fiche métier, la bascule ouvre la fiche du nouveau métier. Une
  page de groupe, de morceau ou de conversation conserve son objet ; le
  contexte ne réattribue pas cet objet à un autre métier.
- L'aide, les démarches, les profils publics et les médias vus en membre
  conservent le même sélecteur. Un visiteur ne le reçoit pas.

## Menus livrés

| Métier                        | Entrées principales                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| Musicien·ne                   | Parcours carrière existant : objectifs, carte, groupes, morceaux, agenda                      |
| Ingé son                      | Fiche métier, objectifs, échanges/collaborations, travaux/matériel, studios                   |
| Producteur·rice               | Fiche métier, objectifs, échanges, productions, studios, morceaux/crédits                     |
| Organisateur·rice             | Fiche métier, objectifs, plateaux et candidatures, organisations/lieux, événements passés     |
| Manager                       | Fiche métier, objectifs, accompagnements, échanges et fiche détaillée                         |
| Booker / programmateur·rice   | Fiche métier, objectifs, accompagnements/dates bookées, échanges, annonces et fiche détaillée |
| Label, édition, communication | Fiche déclarative et mention explicite « bientôt » ; aucun parcours professionnel inventé     |

Les fonctions et données communes restent accessibles. Les limites d'âge,
les permissions des structures et les contrôles d'accès des pages cibles
restent appliqués côté serveur. Les menus ne constituent pas des droits.

## Stockage et confidentialité

Le choix est un cookie de session du navigateur `lm_track_context`,
HttpOnly, SameSite=Lax, Secure en production, sans durée persistante.
Il contient l'identifiant interne de la personne et le code métier.
À chaque lecture, le serveur vérifie l'appartenance au compte connecté et
la présence actuelle du métier. Un cookie altéré, d'un autre compte ou
portant un métier retiré ramène au principal, puis au premier métier détenu.

Aucune migration ni nouvelle donnée personnelle en base : pas de nouveau
champ à exporter ou anonymiser. Le cookie n'entre ni dans l'XP ni dans le
rang, la confiance, les filtres de recherche ou les permissions. Il n'est
pas renvoyé dans les données de page ; seule la projection de navigation
est exposée à son propriétaire.

L'action POST `/jouer?/switchTrack` valide le code avec Zod et refuse un
métier non détenu. Le retour est limité aux chemins locaux de l'espace,
avec un repli sur `/espace` ; aucune redirection externe n'est acceptée.
Les protections d'authentification et CSRF habituelles sont conservées.

## Limites et suite

DASH-01 ne livre pas les nouveaux outils professionnels des DASH-02 à 19.
Les portfolios avancés et annonces qualifiées encore en attente dans
#26/#27 ne sont pas présentés comme terminés. Le « Pour toi » fondé sur
ces futures annonces reste dans leurs tickets ; les filtres actuels et
la recherche par offres continuent de fonctionner.

## Vérifications

- `navigation.test.ts` (règle pure) : métier actif, repli après retrait,
  conservation des filtres, retours externes refusés, existence des routes
  de chaque menu et limites des métiers bientôt.
- `server/actors/navigation.test.ts` : cookie d'un autre compte, contenu
  invalide, métier non détenu, stockage de session protégé.
- `e2e/linkmusician/navigation-metiers.spec.ts` : cookie/action serveur
  avec base dédiée, clavier, mobile 390 px, axe, conservation des filtres,
  fiches métier, pages publiques, refus 400/403, métiers ouverts/bientôt,
  retrait du métier et principal inchangé.
- `modes.spec.ts` et `aide.spec.ts` : non-régression des parcours existants.

Recette du 12/11/2026 : 4 tests navigateur réussis (navigation multirôle,
choix des modes et aide), 1 315 tests unitaires réussis (245 tests
conditionnels non exécutés), contrôle des types sans erreur ni avertissement.
Contrôle visuel avec Samir sur 1 440, 390 et 320 px : aucun débordement de
page ni erreur JavaScript. ESLint ciblé : aucune erreur, avertissements de
navigation Svelte non bloquants. L’issue GitHub n’est pas clôturée
par cette validation locale.

## Actions prioritaires — DASH-03

Les six espaces ouverts partagent désormais un premier pivot « priorités » :
candidatures reçues, demandes de contact, collaborations à valider et dates
prévues. L'ordre est configuré par métier, puis ajusté aux réponses réelles.
Les données restent communes au compte ; le contexte n'accorde aucun droit.
Audit des services, limites de lecture et règles de filtrage :
[Actions prioritaires métier](./11-actions-metiers.md).
