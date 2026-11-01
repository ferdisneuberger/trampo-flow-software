ALTER TABLE "applications" ADD COLUMN "user_id" UUID;

UPDATE "applications"
SET "user_id" = (SELECT "id" FROM "users" ORDER BY "created_at" LIMIT 1)
WHERE "user_id" IS NULL;

ALTER TABLE "applications" ALTER COLUMN "user_id" SET NOT NULL;

DROP INDEX "applications_status_idx";
DROP INDEX "applications_deleted_at_idx";

CREATE INDEX "applications_user_id_created_at_idx" ON "applications"("user_id", "created_at" DESC);
CREATE INDEX "applications_user_id_status_idx" ON "applications"("user_id", "status");
CREATE INDEX "applications_user_id_deleted_at_idx" ON "applications"("user_id", "deleted_at");

ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
