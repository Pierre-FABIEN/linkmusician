-- DASH-04b : ajout seul ; retour arrière : DROP TABLE representation_delegations.
CREATE TABLE "representation_delegations" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "representationId" TEXT NOT NULL REFERENCES "representations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "agencyId" TEXT NOT NULL REFERENCES "organizations"("actorId") ON DELETE CASCADE ON UPDATE CASCADE,
 "delegateId" TEXT NOT NULL REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "agentMembershipId" TEXT NOT NULL REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "delegateMembershipId" TEXT NOT NULL REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "proposedById" TEXT REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "approvedById" TEXT REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "approvedAt" TIMESTAMP(3), "acceptedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3),
 "actions" TEXT[] NOT NULL,
 "endedAt" TIMESTAMP(3),
 "endedById" TEXT REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "delegation_actions_check" CHECK (
  'VIEW_MANDATE'=ANY("actions") AND "actions" <@ ARRAY['VIEW_MANDATE','END_MANDATE']::TEXT[]
 )
);
CREATE INDEX "representation_delegations_delegateId_endedAt_idx" ON "representation_delegations"("delegateId","endedAt");
CREATE INDEX "representation_delegations_representationId_endedAt_idx" ON "representation_delegations"("representationId","endedAt");
CREATE UNIQUE INDEX "delegation_open_key" ON "representation_delegations"("representationId","agencyId","delegateId") WHERE "endedAt" IS NULL;
