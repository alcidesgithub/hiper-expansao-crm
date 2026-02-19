-- Dashboard-focused performance indexes (Coolify production).
-- Targets heavy aggregations and first-load queries in dashboard actions.

-- Lead: time-window + status/source/grade aggregations
CREATE INDEX IF NOT EXISTS "Lead_updatedAt_idx"
  ON "Lead" ("updatedAt");

CREATE INDEX IF NOT EXISTS "Lead_status_createdAt_idx"
  ON "Lead" ("status", "createdAt");

CREATE INDEX IF NOT EXISTS "Lead_createdAt_source_idx"
  ON "Lead" ("createdAt", "source");

CREATE INDEX IF NOT EXISTS "Lead_createdAt_grade_idx"
  ON "Lead" ("createdAt", "grade");

-- Meeting: upcoming counts/lists and acquisition conversion EXISTS
CREATE INDEX IF NOT EXISTS "Meeting_status_startTime_idx"
  ON "Meeting" ("status", "startTime");

CREATE INDEX IF NOT EXISTS "Meeting_leadId_status_createdAt_idx"
  ON "Meeting" ("leadId", "status", "createdAt");

-- Notification: dashboard header unread notifications
CREATE INDEX IF NOT EXISTS "Notification_userId_read_createdAt_idx"
  ON "Notification" ("userId", "read", "createdAt");

-- AuditLog: acquisition funnel audit aggregation
CREATE INDEX IF NOT EXISTS "AuditLog_entity_action_createdAt_idx"
  ON "AuditLog" ("entity", "action", "createdAt");

CREATE INDEX IF NOT EXISTS "AuditLog_acquisition_createdAt_action_entityId_idx"
  ON "AuditLog" ("createdAt", "action", "entityId")
  WHERE "entity" = 'AcquisitionEvent'
    AND "action" IN ('LP_VIEW', 'LP_CTA_CLICK');

CREATE INDEX IF NOT EXISTS "AuditLog_acquisition_utm_dims_createdAt_idx"
  ON "AuditLog" (("changes"->>'utmSource'), ("changes"->>'utmCampaign'), "createdAt")
  WHERE "entity" = 'AcquisitionEvent'
    AND "action" IN ('LP_VIEW', 'LP_CTA_CLICK');

-- Lead: gate profile dashboard aggregation over qualificationData
CREATE INDEX IF NOT EXISTS "Lead_gate_profile_createdAt_idx"
  ON "Lead" (
    "createdAt",
    (LOWER(COALESCE("qualificationData"->>'gateProfile', "qualificationData"->>'role', '')))
  )
  WHERE "qualificationData" IS NOT NULL
    AND "qualificationData" <> 'null'::jsonb;
