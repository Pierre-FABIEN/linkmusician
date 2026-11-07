# Seeds Prisma

## Démo LinkMusician

Pour remplir les données LinkMusician sans vider la base :

```bash
npm run db:deploy
npm run seed:referentiels
npm run seed:demo
```

Le seed de démo ajoute 13 profils fictifs et leurs scénarios (groupes,
collaborations, jams, morceaux, contacts et messages). Il ne crée pas les
autres données du boilerplate ni les établissements. Ces derniers se chargent
à part avec `npm run seed:etablissements`.
Il génère aussi jusqu'à 12 jams à venir, réparties sur les jours restants du
mois courant, autour de la commune choisie.

Le mot de passe par défaut est `DemoPass!2026` pour les 13 comptes, sauf si
`SEED_DEMO_PASSWORD` est défini dans `.env`. Le seed peut ajouter un suffixe
au handle si l'adresse habituelle est déjà prise.

Dans la base locale actuelle, les 13 handles habituels étaient déjà pris.
Les comptes de démo créés utilisent donc ces adresses :

| Profil | E-mail                                       |
| ------ | -------------------------------------------- |
| Malik  | `malik-batterie-demo@demo.linkmusician.test` |
| Inès   | `ines-chant-demo@demo.linkmusician.test`     |
| Théo   | `theo-basse-demo@demo.linkmusician.test`     |
| Clara  | `clara-guitare-demo@demo.linkmusician.test`  |
| Samir  | `samir-son-demo@demo.linkmusician.test`      |
| Nora   | `nora-prod-demo@demo.linkmusician.test`      |
| Lucas  | `lucas-sax-demo@demo.linkmusician.test`      |
| Zoé    | `zoe-violon-demo@demo.linkmusician.test`     |
| Kévin  | `kevin-metal-demo@demo.linkmusician.test`    |
| Awa    | `awa-clavier-demo@demo.linkmusician.test`    |
| Hugo   | `hugo-dj-demo@demo.linkmusician.test`        |
| Manon  | `manon-ukulele-demo@demo.linkmusician.test`  |
| Jade   | `jade-batterie-demo@demo.linkmusician.test`  |

Par exemple, `malik-batterie@demo.linkmusician.test` sans `-demo` est un
ancien compte, sans métier configuré ; il mène normalement à « Qui es-tu ? ».
Pour la démo complète de Malik, utilise l'adresse `malik-batterie-demo` du
tableau. Pour toute autre base, les adresses exactes sont celles affichées à
la fin de `npm run seed:demo`.

Un lancement réussi affiche `Démo LinkMusician : 13 compte(s) créé(s), 0 déjà
présent(s)` la première fois, puis `Connexion : <handle>@demo.linkmusician.test
/ <mot de passe>`. Aux lancements suivants, les comptes existants ne sont pas
mis à jour ; les scénarios ne sont pas rejoués si « Les Rats du Mardi » existe
déjà. Le compteur permet donc de voir ce qui a été ajouté pendant ce lancement,
pas de vérifier à lui seul l'ensemble des données déjà en base.

Avant toute écriture, le seed vérifie que les handles ne sont pas pris par
d'autres profils. En cas de collision, il choisit un handle libre avec le
suffixe `-demo` (puis `-demo-2`, etc.) sans modifier les profils existants.
La sortie du seed affiche toujours les e-mails exacts à utiliser.

## Autres seeds

- `npm run seed:referentiels` charge les instruments, genres et étapes. Il est
  rejouable et ne vide pas la base.
- `npm run seed:etablissements` importe les établissements de Toulouse
  Métropole ; il nécessite un accès réseau à l'API publique.
- `npm run seed` **vide toute la base** avant de créer les données de démo du
  boilerplate (boutique, blog, comptes), les référentiels et la démo
  LinkMusician. Ne pas le lancer sur une base à conserver.

Le seed global crée aussi `admin@madeindiamonds.com`,
`lea@atelier-nord.fr`, `marc.durand@example.com` et
`nina.petit@example.com`, avec le même mot de passe par défaut ou
`SEED_DEMO_PASSWORD`. `claire.morel@gmail.com` est un compte Google sans mot de
passe local ; le compte Marc a la 2FA activée avec des données fictives et ne
convient pas à une connexion normale.

Voir aussi [seed-demo.ts](./seed-demo.ts), [seed-scenarios.ts](./seed-scenarios.ts)
et le [README du projet](../README.md#démarrer).
