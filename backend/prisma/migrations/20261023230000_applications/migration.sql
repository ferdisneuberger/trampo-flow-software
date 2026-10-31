-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- DropTable
DROP TABLE "job_applications";

-- DropEnum
DROP TYPE "JobApplicationStatus";

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "link" VARCHAR(2048) NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "current_phase" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_files" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_in_bytes" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE INDEX "applications_deleted_at_idx" ON "applications"("deleted_at");

-- CreateIndex
CREATE INDEX "application_files_application_id_idx" ON "application_files"("application_id");

-- AddForeignKey
ALTER TABLE "application_files" ADD CONSTRAINT "application_files_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
