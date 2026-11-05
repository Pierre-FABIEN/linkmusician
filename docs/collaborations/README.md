# Collaborations

Module LinkMusician (lot P2-06, conception 02 §2.2 et §6). Le lot central
de la phase 2 : c'est ce qui fait progresser **ensemble**.

## Parcours

1. Dans une conversation ouverte (les deux l'ont acceptée), « Vous avez
   joué ensemble ? Proposer une collaboration » : type (jam, répétition,
   session ou remplacement, enregistrement), titre, date (jusqu'à 60 jours
   en arrière, 90 jours à l'avance).
2. **Déjà passée** : proposer vaut confirmation pour soi ; l'autre n'a
   qu'à **confirmer** (ou « Ce n'est pas exact », qui l'annule).
3. **À venir** : l'autre accepte ; chacun confirme une fois la date passée.
4. Confirmée par tous : `collaboration.completed` part vers le moteur, dans
   la même transaction.

Les collaborations à confirmer apparaissent sur le tableau de bord
(« À confirmer »). Chacun peut annuler tant qu'elle n'est pas confirmée.

## Ce que ça rapporte

**400 XP × multiplicateur**, pour chacun (règle `collaboration.completed`) :

- **rendement décroissant** avec la même personne sur 12 mois : 100 %, 50 %,
  25 %, puis 0 ;
- **poids de confiance** de l'autre : TL0 ×0,1, TL1 ×0,5, TL2 et plus ×1.
  Deux comptes neufs gagnent donc 40 XP chacun : le farming entre comptes
  neufs ne paie pas.

Elle compte aussi pour les paliers (« En réseau », « Collaborateur »), la
confiance (collaboration avec un membre de confiance pour TL2) et « Ce
que d'autres confirment » sur le profil public.

## Règles

- Seulement avec un **contact** (conversation acceptée des deux côtés) et
  jamais à travers un blocage.
- Une seule collaboration par conversation et par jour.
- **RGPD** : collaborations dans l'export ; elles survivent à
  l'anonymisation d'un participant (« Compte supprimé » pour l'autre).

## Code et tests

- Règles pures : `src/lib/collaborations/rules.ts` (dates, état, étape
  suivante).
- Service : `src/lib/server/collaborations/service.ts`.
- Intégration (rendements décroissants, poids de confiance) :
  `PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/progression/collaborations`.
- E2E : `e2e/linkmusician/candidatures.spec.ts` (annonce → candidature →
  conversation → collaboration confirmée → XP des deux côtés).
