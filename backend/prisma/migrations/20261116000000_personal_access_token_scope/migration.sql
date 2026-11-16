-- AlterTable: tokens existentes mantêm leitura e escrita.
ALTER TABLE "personal_access_tokens" ADD COLUMN "scope" VARCHAR(100) NOT NULL DEFAULT 'applications:read applications:write';
