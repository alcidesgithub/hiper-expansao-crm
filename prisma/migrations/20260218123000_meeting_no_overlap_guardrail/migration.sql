-- Enforce scheduling invariants in Postgres (protects against race conditions)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Basic temporal validity for meetings.
ALTER TABLE "Meeting"
ADD CONSTRAINT "meeting_time_window_valid"
CHECK ("startTime" < "endTime");

-- Prevent overlapping active meetings for the same consultant.
ALTER TABLE "Meeting"
ADD CONSTRAINT "meeting_no_overlap_active"
EXCLUDE USING gist (
  "userId" WITH =,
  tsrange("startTime", "endTime", '[)') WITH &&
)
WHERE ("status" IN ('SCHEDULED', 'RESCHEDULED'));
