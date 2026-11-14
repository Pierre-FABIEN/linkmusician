-- DASH-05h : les douze actes déjà livrés restent uniques par période/type.
-- Les quatre nouveaux BAND_* sont répétables sous verrou métier band:.
CREATE UNIQUE INDEX "membership_decisions_once_key"
ON "membership_decisions"("membershipId", "kind")
WHERE "kind" IN ('ACCEPTED', 'DECLINED', 'WITHDRAWN', 'LEFT', 'REMOVED',
  'RESPONSIBILITY_RECEIVED', 'JOIN_REQUESTED', 'REQUEST_ACCEPTED',
  'REQUEST_DECLINED', 'REQUEST_WITHDRAWN', 'REQUEST_CLOSED', 'RECRUITMENT_ACCEPTED');
