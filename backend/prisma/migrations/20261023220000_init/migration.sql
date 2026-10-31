-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM ('DRAFT', 'APPLIED', 'INTERVIEW', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "job_applications" (
    "id" UUID NOT NULL,
    "company" VARCHAR(120) NOT NULL,
    "role" VARCHAR(120) NOT NULL,
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "applied_at" TIMESTAMP(3),
    "notes" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_applications_status_idx" ON "job_applications"("status");
