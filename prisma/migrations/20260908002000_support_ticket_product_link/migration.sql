-- AlterTable
ALTER TABLE "public"."SupportTicket" ADD COLUMN     "productId" UUID;

-- CreateIndex
CREATE INDEX "SupportTicket_productId_idx" ON "public"."SupportTicket"("productId");

-- AddForeignKey
ALTER TABLE "public"."SupportTicket" ADD CONSTRAINT "SupportTicket_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;