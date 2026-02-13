-- Normalize existing pipeline flags to keep a single canonical active/default pipeline.
WITH ranked_flagged AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            ORDER BY
                CASE WHEN id = 'pipeline-default' THEN 0 ELSE 1 END,
                "isActive" DESC,
                "isDefault" DESC,
                "createdAt" ASC
        ) AS rn
    FROM "Pipeline"
    WHERE "isActive" = true OR "isDefault" = true
)
UPDATE "Pipeline" AS p
SET
    "isActive" = CASE WHEN rf.rn = 1 THEN true ELSE false END,
    "isDefault" = CASE WHEN rf.rn = 1 THEN true ELSE false END
FROM ranked_flagged AS rf
WHERE p.id = rf.id;

-- If none is flagged, promote one pipeline as canonical.
WITH fallback_pipeline AS (
    SELECT id
    FROM "Pipeline"
    ORDER BY
        CASE WHEN id = 'pipeline-default' THEN 0 ELSE 1 END,
        "createdAt" ASC
    LIMIT 1
)
UPDATE "Pipeline" AS p
SET
    "isActive" = true,
    "isDefault" = true
FROM fallback_pipeline AS fp
WHERE p.id = fp.id
  AND NOT EXISTS (
    SELECT 1
    FROM "Pipeline"
    WHERE "isActive" = true OR "isDefault" = true
  );

-- default=true must always imply active=true.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Pipeline_default_requires_active_chk'
    ) THEN
        ALTER TABLE "Pipeline"
            ADD CONSTRAINT "Pipeline_default_requires_active_chk"
            CHECK (NOT "isDefault" OR "isActive");
    END IF;
END $$;

-- Enforce only one active and only one default pipeline.
CREATE UNIQUE INDEX IF NOT EXISTS "Pipeline_single_active_true_idx"
    ON "Pipeline" ("isActive")
    WHERE "isActive" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "Pipeline_single_default_true_idx"
    ON "Pipeline" ("isDefault")
    WHERE "isDefault" = true;
