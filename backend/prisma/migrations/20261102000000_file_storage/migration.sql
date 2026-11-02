ALTER TABLE "application_files" ADD COLUMN "storage_key" VARCHAR(512);
ALTER TABLE "application_files" ADD COLUMN "legacy_url" VARCHAR(2048);
ALTER TABLE "application_files" ADD COLUMN "checksum" VARCHAR(64);

UPDATE "application_files" SET "legacy_url" = "url";

ALTER TABLE "application_files" DROP COLUMN "url";

CREATE UNIQUE INDEX "application_files_storage_key_key" ON "application_files"("storage_key");
