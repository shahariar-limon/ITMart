-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('customer', 'technician', 'admin');

-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('personal', 'business');

-- CreateEnum
CREATE TYPE "public"."ProductStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "public"."PriceModel" AS ENUM ('fixed', 'starting_at', 'quote');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('cod', 'simulated');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('unpaid', 'authorized');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('requested', 'confirmed', 'assigned', 'scheduled', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."SolutionStatus" AS ENUM ('submitted', 'quoted', 'accepted', 'rejected');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'customer',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "scheduleVersion" INTEGER NOT NULL DEFAULT 0,
    "accountType" "public"."AccountType" NOT NULL DEFAULT 'personal',
    "businessDiscountBps" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "categoryId" UUID NOT NULL,
    "brand" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT[],
    "imageUrls" TEXT[],
    "price" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "specs" JSONB NOT NULL DEFAULT '{}',
    "warranty" TEXT NOT NULL DEFAULT '',
    "status" "public"."ProductStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Cart" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CartItem" (
    "cartId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("cartId","productId")
);

-- CreateTable
CREATE TABLE "public"."CartBundleItem" (
    "cartId" UUID NOT NULL,
    "bundleId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "CartBundleItem_pkey" PRIMARY KEY ("cartId","bundleId")
);

-- CreateTable
CREATE TABLE "public"."Service" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceModel" "public"."PriceModel" NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Bundle" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bundlePrice" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BundleProduct" (
    "bundleId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "BundleProduct_pkey" PRIMARY KEY ("bundleId","productId")
);

-- CreateTable
CREATE TABLE "public"."BundleService" (
    "bundleId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,

    CONSTRAINT "BundleService_pkey" PRIMARY KEY ("bundleId","serviceId")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" UUID NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discountTotal" INTEGER NOT NULL,
    "grandTotal" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "paymentMethod" "public"."PaymentMethod" NOT NULL DEFAULT 'cod',
    "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "paymentReference" TEXT,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'pending',
    "shippingAddress" TEXT NOT NULL,
    "inventoryRestoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "sourceBundleId" UUID,
    "nameSnapshot" TEXT NOT NULL,
    "skuSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "lineTotal" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderBundleItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "bundleId" UUID NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "lineTotal" INTEGER NOT NULL,

    CONSTRAINT "OrderBundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderBundleService" (
    "orderBundleItemId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,

    CONSTRAINT "OrderBundleService_pkey" PRIMARY KEY ("orderBundleItemId","serviceId")
);

-- CreateTable
CREATE TABLE "public"."OrderStatusHistory" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "from" "public"."OrderStatus",
    "to" "public"."OrderStatus" NOT NULL,
    "changedBy" UUID NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceBooking" (
    "id" UUID NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "technicianId" UUID,
    "serviceNameSnapshot" TEXT NOT NULL,
    "basePriceSnapshot" INTEGER NOT NULL,
    "durationMinutesSnapshot" INTEGER NOT NULL,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'requested',
    "preferredStart" TIMESTAMP(3),
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "address" TEXT NOT NULL,
    "customerNotes" TEXT NOT NULL DEFAULT '',
    "technicianNotes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BookingStatusHistory" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "from" "public"."BookingStatus",
    "to" "public"."BookingStatus" NOT NULL,
    "changedBy" UUID NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Review" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "verifiedPurchase" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Wishlist" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WishlistProduct" (
    "wishlistId" UUID NOT NULL,
    "productId" UUID NOT NULL,

    CONSTRAINT "WishlistProduct_pkey" PRIMARY KEY ("wishlistId","productId")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" UUID,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SolutionRequest" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "status" "public"."SolutionStatus" NOT NULL DEFAULT 'submitted',
    "quotedPrice" INTEGER,
    "adminNotes" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3),
    "orderId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolutionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SolutionQuoteProduct" (
    "solutionId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "SolutionQuoteProduct_pkey" PRIMARY KEY ("solutionId","productId")
);

-- CreateTable
CREATE TABLE "public"."SolutionQuoteService" (
    "solutionId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,

    CONSTRAINT "SolutionQuoteService_pkey" PRIMARY KEY ("solutionId","serviceId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "public"."User"("role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "public"."Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "public"."Product"("sku");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "public"."Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_brand_idx" ON "public"."Product"("brand");

-- CreateIndex
CREATE INDEX "Product_status_categoryId_brand_price_idx" ON "public"."Product"("status", "categoryId", "brand", "price");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "public"."Cart"("userId");

-- CreateIndex
CREATE INDEX "Service_isActive_category_name_idx" ON "public"."Service"("isActive", "category", "name");

-- CreateIndex
CREATE INDEX "Bundle_isActive_createdAt_idx" ON "public"."Bundle"("isActive", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "public"."Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "public"."Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "public"."Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_changedAt_idx" ON "public"."OrderStatusHistory"("orderId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceBooking_bookingNumber_key" ON "public"."ServiceBooking"("bookingNumber");

-- CreateIndex
CREATE INDEX "ServiceBooking_userId_createdAt_idx" ON "public"."ServiceBooking"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceBooking_technicianId_status_scheduledStart_scheduled_idx" ON "public"."ServiceBooking"("technicianId", "status", "scheduledStart", "scheduledEnd");

-- CreateIndex
CREATE INDEX "BookingStatusHistory_bookingId_changedAt_idx" ON "public"."BookingStatusHistory"("bookingId", "changedAt");

-- CreateIndex
CREATE INDEX "Review_productId_createdAt_idx" ON "public"."Review"("productId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_productId_key" ON "public"."Review"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_userId_key" ON "public"."Wishlist"("userId");

-- CreateIndex
CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "public"."Notification"("recipientId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SolutionRequest_orderId_key" ON "public"."SolutionRequest"("orderId");

-- CreateIndex
CREATE INDEX "SolutionRequest_userId_createdAt_idx" ON "public"."SolutionRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SolutionRequest_status_idx" ON "public"."SolutionRequest"("status");

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "public"."Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartBundleItem" ADD CONSTRAINT "CartBundleItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "public"."Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartBundleItem" ADD CONSTRAINT "CartBundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "public"."Bundle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BundleProduct" ADD CONSTRAINT "BundleProduct_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "public"."Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BundleProduct" ADD CONSTRAINT "BundleProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BundleService" ADD CONSTRAINT "BundleService_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "public"."Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BundleService" ADD CONSTRAINT "BundleService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_sourceBundleId_fkey" FOREIGN KEY ("sourceBundleId") REFERENCES "public"."Bundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderBundleItem" ADD CONSTRAINT "OrderBundleItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderBundleItem" ADD CONSTRAINT "OrderBundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "public"."Bundle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderBundleService" ADD CONSTRAINT "OrderBundleService_orderBundleItemId_fkey" FOREIGN KEY ("orderBundleItemId") REFERENCES "public"."OrderBundleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderBundleService" ADD CONSTRAINT "OrderBundleService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceBooking" ADD CONSTRAINT "ServiceBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceBooking" ADD CONSTRAINT "ServiceBooking_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceBooking" ADD CONSTRAINT "ServiceBooking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookingStatusHistory" ADD CONSTRAINT "BookingStatusHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."ServiceBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookingStatusHistory" ADD CONSTRAINT "BookingStatusHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WishlistProduct" ADD CONSTRAINT "WishlistProduct_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "public"."Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WishlistProduct" ADD CONSTRAINT "WishlistProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SolutionRequest" ADD CONSTRAINT "SolutionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SolutionRequest" ADD CONSTRAINT "SolutionRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SolutionQuoteProduct" ADD CONSTRAINT "SolutionQuoteProduct_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "public"."SolutionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SolutionQuoteProduct" ADD CONSTRAINT "SolutionQuoteProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SolutionQuoteService" ADD CONSTRAINT "SolutionQuoteService_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "public"."SolutionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SolutionQuoteService" ADD CONSTRAINT "SolutionQuoteService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
