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

