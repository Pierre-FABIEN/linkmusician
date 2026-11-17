# Prompt de reprise — après DASH-07a

```markdown
Reprends LinkMusician dans /home/pierre/linkmusician. Une session = un lot.
Travaille directement sur main, sans push (l'utilisateur pousse depuis VS Code ;
ce terminal n'a ni gh ni identifiants GitHub). Commence par git status, git log
et git ls-remote origin refs/heads/main ; préserve commits et modifications,
y compris celles d'une autre session (ne commite pas un travail qui n'est pas
le tien sans le dire). Les issues GitHub sont publiques : lis-les par l'API
(curl), sans les modifier sans instruction.

État au 17/11/2026 :

- Publiés sur origin/main (676cf00) : ONB-13b (#27, annonces qualifiées) et
  D71 (d2f15ca, droit de candidater pour autrui, validé par l'utilisateur).
- DASH-07a (#37) livré en local, commit « (DASH-07a) » : droit de candidater
  ApplicationGrant + actes ApplicationGrantAct en ajout seul (migration
  20261117150401_application_grants, contrainte application_grants_kinds_check).
  Demandé par l'agent titulaire d'un mandat confirmé, accordé par l'artiste
  majeur·e ou la gestion majeure du groupe, révocable, fin ≤ 6 mois et dans le
  mandat. Types : groupe → GIG_SLOT ; personne → JAM, SESSION_WORK (pas de type
  « remplacement » distinct) ; booker → plateaux seulement. Page
  /accompagnement/[id]/candidatures, notification APPLICATION_GRANT, RGPD,
  démo Élise → Fanfare Pirate. Aucune candidature n'est encore envoyée.
- Écart d'environnement connu : deux tests à barrières de
  locking.integration.test.ts dépassent leur lock_timeout (55P03), à
  l'identique sur le code d'origine. Pas une régression.

Lot suivant : DASH-07b (#37) — candidature déléguée. Lis CLAUDE.md,
docs/plan/README.md §4, docs/plan/fin-du-projet.md (fiche DASH-07b),
docs/conception/18-candidature-deleguee.md, D71 dans docs/decisions/README.md,
src/lib/server/representation/applicationGrants.ts (lockGrantPair,
usableGrant), src/lib/server/opportunities/applications.ts (applyTo,
withdrawApplication, decideApplication) et gigSlots.ts (applyAsBand,
withdrawBandApplication), et le traitement de conversation.reciprocated.

Contrat (D71, déjà validé) :

- « Candidater au nom de <artiste> » sur une annonce couverte, seulement avec un
  droit actif ; dans la transaction : lockGrantPair, puis FOR UPDATE de
  l'annonce, usableGrant, mêmes conditions que la candidature directe sur
  l'artiste (eligibilityFor / checkBand), blocages entre l'émetteur et
  l'artiste comme l'agent, visibilité, doublon (unique opportunity/applicant),
  acte USED avec applicationId. applicantActorId = artiste, sentById = agent.
- Envoi direct ; l'artiste (ou sa gestion) est notifié·e, voit « envoyée en ton
  nom par … » et peut retirer (sous verrou, auteur conservé). RECRUIT_MEMBER
  refusé.
- Acceptation : conversation avec l'agent, marquée déléguée ; la réciprocité ne
  rapporte d'XP à personne. Aucune XP pour l'agent par la candidature.
- Tests : intégration (droit absent/révoqué/échu/hors type refusé, course
  révocation contre envoi, mineur·e, groupe, doublon, aucune XP), E2E ciblé
  (390 px, clavier, axe, POST forgé).

Restent ensuite : ONB-12c2 (#26 : portfolio, matériel, tarifs, visibilité
rate/gear, « postproduction » dans SoundSpecialty), ONB-14 (#28, recette
continue), suite de #36 (affectation à un membre avec accord, prestataire
externe, mixage/mastering/production pris soi-même, versions et validations).

Ne lance jamais npm run check pendant les E2E (mémoire WSL) ; ne régénère pas
le client Prisma pendant qu'un E2E tourne. Pour savoir si des E2E tournent,
utilise ps (pgrep -f "playwright test" se détecte lui-même). Ne lance pas
prisma format (il réaligne tout schema.prisma). Migrations :
db:nouvelle-migration, relecture, db:deploy puis db:deploy:e2e. Termine par
conception, docs de domaine, aide, démo, tableau §5, prompt suivant et commit
local en français.
```
