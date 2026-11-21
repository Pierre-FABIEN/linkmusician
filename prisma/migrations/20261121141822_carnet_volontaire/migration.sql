-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).

-- CreateTable
CREATE TABLE "saved_contacts" (
    "ownerId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_contacts_pkey" PRIMARY KEY ("ownerId","contactId")
);

-- CreateIndex
CREATE INDEX "saved_contacts_contactId_idx" ON "saved_contacts"("contactId");

-- CreateIndex
CREATE INDEX "saved_contacts_ownerId_createdAt_idx" ON "saved_contacts"("ownerId", "createdAt");

-- AddForeignKey
ALTER TABLE "saved_contacts" ADD CONSTRAINT "saved_contacts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_contacts" ADD CONSTRAINT "saved_contacts_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- D82 : reprise de l'existant, idempotente, sans rien supprimer.
-- 1. Chaque « Garder le contact » (`musical_ties`) devient une entrée du carnet.
INSERT INTO "saved_contacts" ("ownerId", "contactId", "createdAt")
SELECT "ownerId", "contactId", "createdAt" FROM "musical_ties"
WHERE "ownerId" <> "contactId"
ON CONFLICT ("ownerId", "contactId") DO NOTHING;

-- 2. Chaque membre d'un groupe de contacts est dans le carnet de la
--    personne qui a fait le groupe : c'était un choix volontaire, et un groupe
--    ne contient que des contacts.
INSERT INTO "saved_contacts" ("ownerId", "contactId", "createdAt")
SELECT g."ownerId", m."contactId", MIN(m."addedAt")
FROM "contact_group_members" m
JOIN "contact_groups" g ON g."id" = m."groupId"
WHERE g."ownerId" <> m."contactId"
GROUP BY g."ownerId", m."contactId"
ON CONFLICT ("ownerId", "contactId") DO NOTHING;

-- Les conversations n'ajoutent personne au carnet (D82 §2.2).
