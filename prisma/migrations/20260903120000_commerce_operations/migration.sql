ALTER TYPE "public"."PaymentStatus" ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE "public"."PaymentStatus" ADD VALUE IF NOT EXISTS 'failed';
ALTER TYPE "public"."PaymentStatus" ADD VALUE IF NOT EXISTS 'refunded';
CREATE TYPE "public"."DeliveryMethod" AS ENUM ('standard', 'express', 'pickup');
CREATE TYPE "public"."ReturnStatus" AS ENUM ('requested', 'approved', 'rejected', 'received', 'refunded');
CREATE TYPE "public"."OutboxStatus" AS ENUM ('pending', 'sent', 'failed');

ALTER TABLE "public"."Order" ADD COLUMN "deliveryMethod" "public"."DeliveryMethod" NOT NULL DEFAULT 'standard', ADD COLUMN "deliveryFee" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "idempotencyKey" TEXT, ADD COLUMN "carrier" TEXT, ADD COLUMN "trackingNumber" TEXT, ADD COLUMN "trackingUrl" TEXT, ADD COLUMN "fulfilmentNotes" TEXT NOT NULL DEFAULT '', ADD COLUMN "packedAt" TIMESTAMP(3), ADD COLUMN "shippedAt" TIMESTAMP(3), ADD COLUMN "deliveredAt" TIMESTAMP(3), ADD COLUMN "cancellationReason" TEXT;
UPDATE "public"."Order" SET "idempotencyKey" = 'legacy-' || "id"::text WHERE "idempotencyKey" IS NULL;
ALTER TABLE "public"."Order" ALTER COLUMN "idempotencyKey" SET NOT NULL;
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "public"."Order"("idempotencyKey");

CREATE TABLE "public"."PaymentAttempt" ("id" UUID NOT NULL, "orderId" UUID NOT NULL, "provider" TEXT NOT NULL, "providerReference" TEXT NOT NULL, "amount" INTEGER NOT NULL, "currency" TEXT NOT NULL DEFAULT 'BDT', "status" "public"."PaymentStatus" NOT NULL, "metadata" JSONB NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "PaymentAttempt_providerReference_key" ON "public"."PaymentAttempt"("providerReference");
CREATE INDEX "PaymentAttempt_orderId_createdAt_idx" ON "public"."PaymentAttempt"("orderId", "createdAt");
ALTER TABLE "public"."PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "public"."ReturnRequest" ("id" UUID NOT NULL, "orderId" UUID NOT NULL, "userId" UUID NOT NULL, "reason" TEXT NOT NULL, "status" "public"."ReturnStatus" NOT NULL DEFAULT 'requested', "adminNotes" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id"));
CREATE INDEX "ReturnRequest_orderId_createdAt_idx" ON "public"."ReturnRequest"("orderId", "createdAt");
CREATE INDEX "ReturnRequest_status_createdAt_idx" ON "public"."ReturnRequest"("status", "createdAt");
ALTER TABLE "public"."ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."ReturnRequest" ADD CONSTRAINT "ReturnRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "public"."AuditLog" ("id" UUID NOT NULL, "actorId" UUID, "action" TEXT NOT NULL, "resourceType" TEXT NOT NULL, "resourceId" TEXT NOT NULL, "requestId" TEXT, "metadata" JSONB NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"));
CREATE INDEX "AuditLog_resourceType_resourceId_createdAt_idx" ON "public"."AuditLog"("resourceType", "resourceId", "createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "public"."AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "public"."AuditLog"("action", "createdAt");
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "public"."OutboxMessage" ("id" UUID NOT NULL, "recipientId" UUID NOT NULL, "channel" TEXT NOT NULL DEFAULT 'email', "template" TEXT NOT NULL, "subject" TEXT NOT NULL, "payload" JSONB NOT NULL, "status" "public"."OutboxStatus" NOT NULL DEFAULT 'pending', "attempts" INTEGER NOT NULL DEFAULT 0, "lastError" TEXT, "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "sentAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "OutboxMessage_pkey" PRIMARY KEY ("id"));
CREATE INDEX "OutboxMessage_status_nextAttemptAt_idx" ON "public"."OutboxMessage"("status", "nextAttemptAt");
CREATE INDEX "OutboxMessage_recipientId_createdAt_idx" ON "public"."OutboxMessage"("recipientId", "createdAt");
