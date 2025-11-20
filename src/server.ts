import { App } from "./app";
import { config } from "./config/config";
import { PostgresDatabase } from "./config/database";
import { RabbitMQService } from "./config/rabbitmq";
import { UserRepository } from "./modules/auth/auth.repository";
import { AuthService } from "./modules/auth/auth.service";
import { AuthController } from "./modules/auth/auth.controller";
import { SubscriptionRepository } from "./modules/subscription/sub.repository";
import { SubscriptionService } from "./modules/subscription/sub.service";
import { SubscriptionController } from "./modules/subscription/sub.controller";
import { WebhookRepository } from "./modules/webhook/webhook.repository";
import { WebhookService } from "./modules/webhook/webhook.service";
import { WebhookController } from "./modules/webhook/webhook.controller";
import { WebhookWorker } from "./modules/webhook/webhook.worker";
import { logger } from "./shared/utils/logger";

async function bootstrap() {
  const db = new PostgresDatabase();
  await db.connect();

  const rabbit = new RabbitMQService();
  await rabbit.connect();

  const userRepository = new UserRepository(db);
  const subscriptionRepository = new SubscriptionRepository(db);
  const webhookRepository = new WebhookRepository(db);

  const authService = new AuthService(userRepository);
  const subscriptionService = new SubscriptionService(subscriptionRepository);
  const webhookService = new WebhookService(
    webhookRepository,
    subscriptionRepository,
    rabbit
  );

  const authController = new AuthController(authService);
  const subscriptionController = new SubscriptionController(
    subscriptionService
  );
  const webhookController = new WebhookController(webhookService);

  const webhookWorker = new WebhookWorker(
    rabbit,
    webhookRepository,
    subscriptionRepository
  );
  webhookWorker
    .start()
    .catch((error) => logger.error({ error }, "Webhook worker failed"));

  const app = new App(
    authController,
    subscriptionController,
    webhookController
  );
  app.listen(config.PORT);

  process.on("SIGINT", async () => {
    logger.info("Received SIGINT, shutting down gracefully");
    await rabbit.disconnect();
    await db.disconnect();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  logger.error({ error }, "Server bootstrap error");
  process.exit(1);
});
