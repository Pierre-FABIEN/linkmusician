# Prompt de reprise — état au 04/11/2026 (soir)

> À coller au début de la prochaine session Claude Code, dans le dépôt
> `linkmusician`. Il complète `CLAUDE.md` (lu automatiquement) avec l'état
> exact laissé en fin de session.

---

```markdown
# Reprise LinkMusician — état au 04/11/2026

## À lire avant toute action

1. `CLAUDE.md` : méthode (un lot par session, commité sur `main`), cohabitation avec le boilerplate
   (marqueurs `LINKMUSICIAN:`), invariants.
2. `docs/plan/README.md` §5 (tableau de suivi) et la fiche du prochain lot dans
   `docs/plan/phase-1.md`.
3. `docs/decisions/README.md` : D5, D6, D10, D11, D12, D14 à D18 sont **acceptées**.
   D1-D4, D7-D9 et D13 restent « Proposée ».
4. Modules : `docs/skills/`, `docs/geo/`, `docs/progression/`.
5. `docs/plan/remontees-boilerplate.md` : défauts du boilerplate corrigés ici, à remonter.

## Ce qui est fait (lots ✅)

P0-03 (boutique en veille), P0-04 (PostGIS, gardes modérateur), P1-01 (noyau de
progression pur, barème v1 calibré par personas), P1-03a/b (inscription, métiers),
P1-04 (instruments et genres), P1-05 (ville floutée), P1-06 (profil musical),
P1-06b (profil complet), P1-07 (registre XP, outbox, projections, succès).
Accueil `/` avec connexion ; après vérification de l'email → `/espace`, qui oriente
vers `/bienvenue` puis `/qui-es-tu`. `/espace` affiche niveau, jauge et succès.
Profil complété = +150 XP, une fois.

## État git

**On travaille directement sur `main`** (pas de branche de lot, pas de PR) : `main`
est toujours à jour. Le terminal de Claude n'a pas d'identifiants GitHub :
l'utilisateur pousse `main` depuis VS Code. Les anciennes branches `lot/*` sont toutes
fusionnées dans `main`.

## Environnement

- Base Neon `ep-hidden-meadow-…` : **une seule ligne `DATABASE_URL`** dans `.env` (pooler),
  plus de `DIRECT_URL`. Les e2e en dérivent le schéma `e2e`. `prisma migrate` échoue
  souvent au premier essai (`P1002`) : relancer.
- `npm run dev` de l'utilisateur : port 2000, ne pas l'arrêter. Il doit être **relancé
  après chaque `prisma generate`** (sinon le client Prisma est périmé). Claude teste sur
  son propre serveur, isolé : `E2E_SERVER=1 npx vite dev --port 2002 --strictPort`
  (dossiers `.svelte-kit-e2e` et cache séparés, environnement de `.env`).
- Arrêter un processus : `pgrep -f "[v]ite dev --port 2002" | xargs -r kill`. Jamais
  `pkill -f` ni `pgrep -f motif` sans crochets : le motif attrape le shell de Claude (code 144).
- Comptes de test : inscription par le navigateur, code de vérification lu en base
  (`emailVerificationRequest`), Brevo pouvant refuser l'envoi (IP non autorisée).
  Nettoyer : transactions, commandes, acteur, puis utilisateur.
- Scripts de test navigateur : journaliser dans un fichier (`appendFileSync`) et fermer le
  navigateur dans `finally`, sinon une coupure par `timeout` ne laisse rien.

## Pièges connus

- **Migrations** : retirer à la main les lignes `DROP INDEX transactions_*` et la
  recréation de `blog_posts_published_createdAt_idx`. Types PostGIS qualifiés
  `public.` (le schéma `e2e` ne voit pas `public`). Renommer une migration générée si
  son horodatage précède une migration écrite à la main.
- **`xp_transactions` est protégée par un déclencheur** : UPDATE et DELETE refusés.
  Une annulation passe par `reverseGain` (processor.ts).
- **Formulaires** : champs de lien en `type="text"` (un `type="url"` bloque l'envoi
  sans `https://`). `resetForm: false` quand une action renvoie ses refus en message.
- **Playwright et `smooth-scrollbar`** : le défilement personnalisé peut empêcher
  Playwright d'atteindre un bouton bas de page ; le boilerplate a `requestSubmitForm`.
- Tests d'intégration désactivés par défaut : `GEO_INTEGRATION=1` (src/lib/server/geo),
  `PROGRESSION_INTEGRATION=1` (src/lib/server/progression), schéma `e2e`.

## Provisoire à reprendre

- Confiance = 0 pour tous (`PROVISIONAL_TRUST`, `src/lib/server/progression/context.ts`)
  → P1-09.
- Colonne `tier` de `actor_progress` non renseignée → P1-11.
- Profils complets avant P1-07 : +150 XP au prochain enregistrement.

## Prochain lot proposé : P1-09 (confiance et quotas), puis P1-08 (médias)

P1-09 avant P1-08 : les envois de médias s'appuient sur les quotas de confiance.
Clés Cloudinary présentes dans `.env`. Le webhook Cloudinary ne joint pas `localhost` :
le tester par des requêtes signées simulées.

## Questions à poser au bon moment

- D9 (nom définitif) et D4 (zone de lancement), nécessaires à P0-05 (coquille, accueil).
- Remonter au boilerplate les défauts listés dans `docs/plan/remontees-boilerplate.md`.
- Relancer un jour la suite e2e complète du boilerplate (30-40 min).
```
