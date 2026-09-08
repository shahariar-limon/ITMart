import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { requestId } from "./middleware/request-id.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { cartRouter } from "./modules/carts/cart.routes.js";
import { categoryRouter } from "./modules/categories/category.routes.js";
import { orderRouter } from "./modules/orders/order.routes.js";
import { productRouter } from "./modules/products/product.routes.js";
import { bookingRouter } from "./modules/bookings/booking.routes.js";
import { serviceRouter } from "./modules/services/service.routes.js";
import { userRouter } from "./modules/users/user.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { notificationRouter } from "./modules/notifications/notification.routes.js";
import { reportRouter } from "./modules/reports/report.routes.js";
import { reviewRouter } from "./modules/reviews/review.routes.js";
import { wishlistRouter } from "./modules/wishlists/wishlist.routes.js";
import { bundleRouter } from "./modules/bundles/bundle.routes.js";
import { solutionRouter } from "./modules/solutions/solution.routes.js";
import { supportRouter } from "./modules/support/support.routes.js";
import { paymentRouter } from "./modules/payments/payment.routes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestId);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: false }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/v1/health", (_request, response) => {
    response.json({ success: true, data: { status: "ok" } });
  });
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/categories", categoryRouter);
  app.use("/api/v1/products", productRouter);
  app.use("/api/v1/cart", cartRouter);
  app.use("/api/v1/orders", orderRouter);
  app.use("/api/v1/services", serviceRouter);
  app.use("/api/v1/bookings", bookingRouter);
  app.use("/api/v1/users", userRouter);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api/v1", reviewRouter);
  app.use("/api/v1/wishlist", wishlistRouter);
  app.use("/api/v1/notifications", notificationRouter);
  app.use("/api/v1/reports", reportRouter);
  app.use("/api/v1/bundles", bundleRouter);
  app.use("/api/v1/solutions", solutionRouter);
  app.use("/api/v1/support", supportRouter);
  app.use("/api/v1/payments", paymentRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
