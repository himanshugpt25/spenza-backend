# Spenza Webhook Relay System
### Scalable Webhook Ingestion & Delivery Engine

## 1. Project Overview
This project is a robust, asynchronous webhook handling system designed to ingest high-volume events from external providers and reliably deliver them to user-defined endpoints. It solves the problem of **data loss during server outages** by acting as a durable middleware buffer.

The system is built with a **"Fail-Safe & Fail-Fast"** philosophy:
1.  **Fail-Fast Ingestion:** If the event cannot be persisted to disk immediately, the request is rejected (500) so the sender knows to retry.
2.  **Fail-Safe Delivery:** Once persisted, the delivery is decoupled from the ingestion, ensuring that slow user endpoints do not degrade API performance.

---

## 2. Architecture & Tech Stack

### Backend (Node.js)
We avoided heavy frameworks (like NestJS) in favor of a **clean, domain-driven Express.js architecture** to demonstrate strict control over the request lifecycle and dependency injection.

* **Runtime:** Node.js (TypeScript Strict Mode)
* **API Framework:** Express.js
* **Database:** PostgreSQL 15 (Hybrid Relational + JSONB)
* **Message Broker:** RabbitMQ (AMQP)
* **Validation:** Zod
* **Logging:** Pino

### Frontend (React)
A real-time dashboard for users to manage subscriptions and view live event logs.

* **Framework:** React 18 + Vite
* **State Management:** TanStack Query (Server State) + Context API (Auth)
* **Styling:** Tailwind CSS
* **Real-time:** Socket.io-client

---

## 3. Architectural Diagram

The following diagram illustrates the **Event Lifecycle**, specifically highlighting the separation between the Synchronous Ingestion phase and the Asynchronous Delivery phase.

```text
+-----------------+       +------------+        +------------+       +------------+       +----------+       +------------+
| External Source |       | Spenza API |        | PostgreSQL |       |  RabbitMQ  |       |  Worker  |       | User Server|
+-----------------+       +------------+        +------------+       +------------+       +----------+       +------------+
         |                      |                     |                    |                   |                   |
         |---(1) POST Event---->|                     |                    |                   |                   |
         |                      |                     |                    |                   |                   |
         |                      |----(2) INSERT------>|                    |                   |                   |
         |                      |   (Status:PENDING)  |                    |                   |                   |
         |                      |                     |                    |                   |                   |
         |    [If DB Fails]     |                     |                    |                   |                   |
         |<----(500 Error)------|                     |                    |                   |                   |
         |                      |                     |                    |                   |                   |
         |   [If DB Success]    |                     |                    |                   |                   |
         |                      |--------------------------------(3) Publish------------------>|                   |
         |<---(202 Accepted)----|                     |                    |                   |                   |
         |                      |                     |                    |                   |                   |
         |                      |                     |                    |---(4) Consume---->|                   |
         |                      |                     |                    |                   |                   |
         |                      |                     |                    |                   |----(5) POST------>|
         |                      |                     |                    |                   |                   |
         |                      |                     |                    |                   |<----(200 OK)------|
         |                      |                     |                    |                   |                   |
         |                      |                     |<----(6) UPDATE-----|                   |                   |
         |                      |                     | (Status:COMPLETED) |                   |                   |
         |                      |                     |                    |<----(7) ACK-------|                   |
         |                      |                     |                    |  (Remove Msg)     |                   |
```
-----

## 4\. Core Logic & Design Patterns

### A. The "Hybrid" Database Strategy

We utilized PostgreSQL's unique ability to handle both relational and document data:

  * **Structured Data:** `Users` and `Subscriptions` are stored in normalized relational tables with foreign keys to ensure strict data integrity.
  * **Unstructured Data:** Webhook payloads are stored in a `JSONB` column within the `Events` table.
      * *Benefit:* This avoids the operational complexity of maintaining a separate NoSQL database (like MongoDB) while allowing for high-speed indexing and querying of arbitrary JSON payloads.

### B. Ingestion Logic (The "Envelope" Pattern)

When an event is received, we do not modify the user's payload. Instead, we wrap it in an internal "Envelope" before pushing it to the queue.

  * **Envelope Content:** `SubscriptionID`, `EventID` (Database Primary Key), `TargetURL`, and `RetryCount`.
  * **Security:** This ensures the internal routing logic is separated from the user's raw data, preventing accidental data mutation.

### C. Reliability & Retries (Dead Letter Exchange)

We implemented a **Dead Letter Exchange (DLX)** topology in RabbitMQ to handle failures without blocking the main queue.

1.  **Main Queue:** Processes events immediately.
2.  **Wait Queue:** If delivery fails, the message is routed here with a TTL (Time-To-Live). This queue has no consumers.
3.  **Auto-Requeue:** When the TTL expires, RabbitMQ automatically moves the message back to the Main Queue for a retry.
      * *Benefit:* This creates a "Non-Blocking Retry Loop," preventing a single failing endpoint from clogging the system for other users.

-----

## 5\. Future Improvements & Roadmap

While the current system is production-grade for a V1, the following improvements are planned for V2 to handle Enterprise Scale.

### A. Handling "Permanent Failures" (The Poison Message)

**Current State:** After 5 retries, we log the failure and drop the message.
**V2 Strategy:**

1.  **Final DLQ Storage:** Instead of dropping the message, move it to a persistent "Graveyard" queue or a separate `failed_events` table.
2.  **Manual Replay:** Expose a `POST /events/:id/replay` endpoint. This allows users to fix their server and trigger a re-delivery of the exact same payload from the dashboard.
3.  **Circuit Breaker:** If a subscription fails 100 times consecutively, the system will automatically toggle `is_active = false` to protect our worker resources, requiring the user to manually re-enable it.

### B. Security: HMAC Signatures (Mutual Verification)

**Current State:** We use HTTPS for transport security.
**V2 Strategy:**

1.  **Outgoing (Us -\> Client):** We will sign every webhook request using **HMAC-SHA256**.
      * We will generate a `webhook_secret` for each subscription.
      * We will include a header: `X-Spenza-Signature: <hash>`.
      * *Value:* This allows the client to verify that the request actually came from us and was not tampered with in transit.
2.  **Incoming (Third Party -\> Us):** We will implement a `ValidatorStrategy` pattern.
      * Users can configure which provider (e.g., Stripe, GitHub) is sending the data.
      * Our ingestion middleware will verify the provider's specific signature before accepting the request, preventing spoofed events.

<!-- end list -->