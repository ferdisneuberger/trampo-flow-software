ALTER TABLE "applications" ADD COLUMN "company" VARCHAR(120);
ALTER TABLE "applications" ADD COLUMN "company_url" VARCHAR(2048);
ALTER TABLE "applications" ADD COLUMN "position" INTEGER;

UPDATE "applications"
SET "company" = COALESCE(
  NULLIF(TRIM((regexp_match("title", ' - ([^-]+)$'))[1]), ''),
  'Não informada'
)
WHERE "company" IS NULL;

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "user_id", "status" ORDER BY "created_at", "id"
    ) * 1000 AS "pos"
  FROM "applications"
)
UPDATE "applications" a
SET "position" = r."pos"
FROM ranked r
WHERE a."id" = r."id";

ALTER TABLE "applications" ALTER COLUMN "company" SET NOT NULL;
ALTER TABLE "applications" ALTER COLUMN "position" SET NOT NULL;
ALTER TABLE "applications" ALTER COLUMN "position" SET DEFAULT 0;
