# Affectations et délégations — DASH-04b (#34)

Suite du mandat individuel DASH-04a et des équipes d’agence DASH-02b.
La structure, la période d’adhésion et le mandat restent trois objets distincts.

## Droits nominatifs (D67)

L’agent titulaire d’un accompagnement confirmé propose une affectation à une
personne majeure participant activement à la même agence. Aucun rôle de
gestion d’agence, métier ou rang ne permet d’affecter les mandats d’autrui.
Le collaborateur peut exercer un autre métier : il ne devient pas manager,
booker ni membre du groupe par cette affectation.

L’artiste (ou la gestion majeure actuelle de son groupe) approuve les droits ;
le collaborateur accepte séparément. L’ordre des accords est libre. Aucun droit
n’est actif avant les deux accords. La proposition et ses droits sont immuables :
retirer puis soumettre une nouvelle proposition pour les modifier.

Actions livrées, explicitement affichées avant accord :

- **Consulter l’accompagnement** : les conditions du mandat, sans son message
  privé, sans conversation, projet privé, roster complet ni crédit ;
- **Mettre fin à l’accompagnement**, facultatif et désactivé par défaut :
  terminer la relation dans l’application, avec confirmation explicite et
  auteur réel conservé sur `Representation.endedById`. Aucun engagement ou
  pouvoir de signature contractuelle.

Le mandat parent impose ses activités, son territoire et sa durée. Aucun
élargissement territorial ni changement d’activité n’est possible. Une fin
exclusive plus proche peut être fixée sur l’affectation. Le droit de terminer
porte sur ce mandat entier, dans son périmètre déjà accepté, pas sur un autre
mandat du même artiste. Les gains et crédits du titulaire ne sont jamais
attribués au collaborateur ; l’affectation ne rapporte aucune XP.

Les candidatures et propositions pour autrui restent DASH-07/#37 et DASH-14/#44 ;
options et négociation des dates restent DASH-15/#45. Ces futures actions
nécessiteront leurs propres droits et gardes. Pas de délégation en chaîne :
seul le titulaire du mandat propose, jamais un collaborateur délégué.

## Retrait, permissions et confidentialité

Les deux personnes sont liées aux identifiants de leurs périodes précises
`Membership`. Départ, retrait ou fermeture de l’agence coupe les droits ;
une nouvelle adhésion ne réactive pas une ancienne affectation. Expiration,
fin du mandat, suppression d’acteur, perte du métier du titulaire ou blocage
entre parties rendent aussi l’affectation inactive.

Le titulaire, le collaborateur et l’artiste (sa gestion actuelle) peuvent
retirer une affectation. Les membres ou gestionnaires d’agence non concernés
ne voient aucune liste d’artistes par défaut.

Avant les deux accords ou après invalidation, le collaborateur reçoit seulement
les parties et les droits proposés, ses accords et l’échéance de la proposition ;
les conditions privées du mandat sont absentes du payload. Le titulaire et
l’artiste conservent leur propre accès au mandat. La liste des affectations
est une projection légère d’accords historiques, jamais une autorisation.

Propositions et décisions prennent les verrous artiste puis agence. La fin
déléguée passe par le service métier existant, qui relit la délégation sous
ces verrous : un appel direct au service ou un POST forgé ne contourne rien.
L’index partiel `delegation_open_key` garantit une seule affectation ouverte
par mandat/agence/collaborateur. Dix affectations ouvertes au plus par mandat.
Il est protégé par `scripts/migration-clean.mjs` contre sa suppression lors
d’une migration générée.

## Traces et RGPD

`RepresentationDelegation` garde l’auteur de la proposition, l’approbateur,
les dates des deux accords et l’auteur/date du retrait. Le journal commun
reste DASH-05. Notification `DELEGATION_REQUEST`, avec préférences et texte
propres, distincte de la proposition initiale d’accompagnement.

L’export personnel inclut les affectations et leurs consentements. L’anonymisation
termine les droits du titulaire, de l’artiste individuel ou du collaborateur,
et oublie les auteurs. L’accord donné pour un groupe reste celui du groupe,
avec son horodatage et sans le nom de l’approbateur supprimé. La suppression
physique des acteurs/structures suit les cascades habituelles.

## Réalisation et recette

- règles pures : `src/lib/representation/delegations.ts` ;
- autorisations : `server/representation/delegationAccess.ts` ;
- cycle de vie : `server/representation/delegations.ts` et garde dans
  `representation/service.ts` ;
- `/delegations` (mes seules affectations), `/nouvelle`, `/[id]` ; accès depuis
  Accompagnement et Mes affectations de l’agence ;
- migrations additives de table et notification ; aucune donnée existante
  modifiée. Retour arrière : supprimer la table et, si nécessaire, reconstruire
  l’enum après retrait des notifications de ce nouveau type ;
- seed rejouable : Élise propose une affectation de la Fanfare à Marc, sans donner
  les accords à leur place. Seuls les comptes démo sont sollicités.

Résultats des tests réellement exécutés : `docs/plan/README.md`.
