### Class-Based with Manual Dependency Injection (DI)

---

### 1\. The Project Structure

**Feature-Based / Domain-Driven** structure, not a "Layer-Based" one. This ensures that when you add "Billing" later, you don't touch the "Auth" folder.

```text
/src
│
├── /config             # Environment variables, DB config, RabbitMQ config
│   ├── config.ts       # Zod-validated env vars
│   ├── database.ts     # Postgres connection pool
│   └── rabbitmq.ts     # RabbitMQ connection & channel manager
│
├── /shared             # Reusable code across all modules
│   ├── /middleware     # ErrorHandler, AuthMiddleware, Logger
│   ├── /utils          # AppError, Logger (Pino), ResponseFormatter
│   ├── /types          # Express Request definitions
│   └── /base           # BaseRepository, BaseController classes
│
├── /modules            # THE DOMAIN LOGIC
│   ├── /auth
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   ├── auth.routes.ts
│   │   └── auth.schema.ts    # Zod schemas
│   │
│   ├── /subscription
│   │   ├── sub.controller.ts
│   │   ├── sub.service.ts
│   │   ├── sub.repository.ts
│   │   └── ...
│   │
│   └── /webhook
│       ├── webhook.controller.ts  # Ingestion Logic
│       ├── webhook.service.ts     # Business Logic
│       ├── webhook.repository.ts  # DB Logic
│       ├── webhook.worker.ts      # RabbitMQ Consumer (The Retry Logic)
│       └── webhook.routes.ts
│
├── app.ts              # Express Setup (Middleware registration)
└── server.ts           # COMPOSITION ROOT (Wiring DI and starting server)
```

---

### 2\. Master Instructions for your AI Copilot

Paste the following block into a file named `ARCHITECTURE.md` or `instructions.txt` in your root folder. Tell your AI to "Read this file before generating any code."

```markdown
# Project Architecture & Coding Guidelines

## 1. Architectural Pattern

We are using a **Layered Architecture** with **Manual Dependency Injection**.

- **Controller:** Handles HTTP requests, validation (Zod), and responses. NEVER contains business logic.
- **Service:** Contains all business logic. Calls Repositories. Unknowns about HTTP (no `req` or `res` objects).
- **Repository:** Handles direct Database interaction (Postgres). Returns Domain objects.
- **Worker:** Handles RabbitMQ message consumption.

## 2. Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript (Strict Mode)
- **Database:** PostgreSQL (using `pg` library with raw SQL or Query Builder, NO heavy ORM like TypeORM).
- **Queue:** RabbitMQ (`amqplib`).
- **Validation:** Zod.
- **Logging:** Pino.

## 3. Dependency Injection Rules

All dependencies must be injected via **Constructor Injection**.

- DO NOT import and instantiate services inside other files.
- DO NOT use `new Service()` inside a Controller.
- **Composition Root:** All instantiation happens in `server.ts`.

## 4. Coding Standards

- **Async/Await:** Use for all I/O.
- **Error Handling:**
  - Use a custom `AppError` class extending Error.
  - Throw errors in Services/Repositories.
  - Catch errors ONLY in the `GlobalErrorHandler` middleware.
  - Use `express-async-errors` to avoid try/catch blocks in controllers.
- **Validation:**
  - All `req.body`, `req.query`, and `req.params` must be validated using Zod middleware before reaching the controller.
- **Types:**
  - Define interfaces for all Services and Repositories (e.g., `IAuthService`).
  - Use `DTO` (Data Transfer Object) types inferred from Zod schemas.

## 5. RabbitMQ Pattern

- Use a generic `RabbitMQService` class to manage the connection.
- Workers should handle manual Acknowledgments (`ack`/`nack`).
- Use Dead Letter Exchanges (DLX) for retries.
```

---

### 3\. The "Composition Root" Pattern (Crucial)

This is the most important file. It replaces the "Magic" of NestJS modules. This is where you wire everything together.

**`src/server.ts`**

```typescript
import { App } from "./app";
import { PostgresDatabase } from "./config/database";
import { RabbitMQService } from "./config/rabbitmq";

// Repositories
import { UserRepository } from "./modules/auth/user.repository";
import { SubscriptionRepository } from "./modules/subscription/sub.repository";
import { WebhookRepository } from "./modules/webhook/webhook.repository";

// Services
import { AuthService } from "./modules/auth/auth.service";
import { SubscriptionService } from "./modules/subscription/sub.service";
import { WebhookService } from "./modules/webhook/webhook.service";

// Controllers
import { AuthController } from "./modules/auth/auth.controller";
import { WebhookController } from "./modules/webhook/webhook.controller";

// Workers
import { WebhookWorker } from "./modules/webhook/webhook.worker";

async function bootstrap() {
  // 1. Initialize Infrastructure
  const db = new PostgresDatabase();
  await db.connect();

  const rabbit = new RabbitMQService();
  await rabbit.connect();

  // 2. Initialize Repositories (Inject DB)
  const userRepo = new UserRepository(db);
  const subRepo = new SubscriptionRepository(db);
  const webhookRepo = new WebhookRepository(db);

  // 3. Initialize Services (Inject Repos + Rabbit)
  const authService = new AuthService(userRepo);
  const webhookService = new WebhookService(webhookRepo, subRepo, rabbit);

  // 4. Initialize Controllers (Inject Services)
  const authController = new AuthController(authService);
  const webhookController = new WebhookController(webhookService);

  // 5. Initialize Workers
  const webhookWorker = new WebhookWorker(rabbit, webhookRepo);
  webhookWorker.start();

  // 6. Start Express App (Inject Controllers)
  const app = new App(authController, webhookController);
  app.listen(3000);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### 4\. The Controller Pattern (Clean & Scalable)

**`src/modules/webhook/webhook.controller.ts`**

```typescript
import { Request, Response, NextFunction } from "express";
import { WebhookService } from "./webhook.service";
import { IngestWebhookSchema } from "./webhook.schema";

export class WebhookController {
  // Dependency Injection via Constructor
  constructor(private webhookService: WebhookService) {}

  // Use Arrow functions to preserve 'this' context automatically
  ingest = async (req: Request, res: Response, next: NextFunction) => {
    // Validation handled by middleware, so we can trust the body
    const payload = req.body;
    const { subscriptionId } = req.params;

    const result = await this.webhookService.ingest(subscriptionId, payload);

    res.status(202).json({
      success: true,
      message: "Webhook accepted",
      eventId: result.eventId,
    });
  };
}
```
