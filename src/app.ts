import "express-async-errors";
import express, { Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { AuthController } from "./modules/auth/auth.controller";
import { SubscriptionController } from "./modules/subscription/sub.controller";
import { WebhookController } from "./modules/webhook/webhook.controller";
import { createAuthRouter } from "./modules/auth/auth.routes";
import { createSubscriptionRouter } from "./modules/subscription/sub.routes";
import { createWebhookRouter } from "./modules/webhook/webhook.routes";
import { errorHandler } from "./shared/middleware/errorHandler";
import { logger } from "./shared/utils/logger";
import { config } from "./config/config";

export class App {
  private readonly app: Application;

  constructor(
    private readonly authController: AuthController,
    private readonly subscriptionController: SubscriptionController,
    private readonly webhookController: WebhookController
  ) {
    this.app = express();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  private configureMiddleware() {
    this.app.use(
      cors({
        origin: config.CORS_ORIGIN,
        credentials: true,
      })
    );
    this.app.use(cookieParser());
    this.app.use(express.json({ limit: "1mb" }));
  }

  private configureRoutes() {
    this.app.get("/health", (_req, res) => res.json({ status: "ok" }));
    this.app.use("/api/v1/auth", createAuthRouter(this.authController));
    this.app.use(
      "/api/v1/subscriptions",
      createSubscriptionRouter(this.subscriptionController)
    );
    this.app.use(
      "/api/v1/webhooks",
      createWebhookRouter(this.webhookController)
    );
  }

  private configureErrorHandling() {
    this.app.use(errorHandler);
  }

  listen(port: number): void {
    this.app.listen(port, () => {
      logger.info({ port }, "HTTP server listening");
    });
  }

  get instance(): Application {
    return this.app;
  }
}
