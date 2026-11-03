ALTER TABLE "users" ADD COLUMN "email" VARCHAR(254),
ADD COLUMN "email_verified_at" TIMESTAMP(3),
ADD COLUMN "verification_sent_at" TIMESTAMP(3),
ADD COLUMN "terms_accepted_at" TIMESTAMP(3),
ADD COLUMN "terms_version" VARCHAR(20);

ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_email_lower_key" ON "users"(lower("email")) WHERE "email" IS NOT NULL;
