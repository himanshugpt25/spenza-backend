# Spenza Backend - Webhook Relay System

A scalable, production-ready webhook handling system built with Node.js, PostgreSQL, RabbitMQ, and Socket.io.

## Features

- **Asynchronous Webhook Processing**: Decoupled ingestion and delivery using RabbitMQ
- **Real-time Updates**: Socket.io integration for live event streaming
- **Soft Delete**: Subscription cancellation without data loss
- **Retry Mechanism**: Automatic retry with exponential backoff
- **JWT Authentication**: Secure API and WebSocket connections
- **Type-safe**: Built with TypeScript in strict mode

## Prerequisites

- Node.js 20.x or higher
- Docker & Docker Compose
- npm or yarn

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd spenza-backend
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgres://backend:backend@localhost:5433/spenza
MIGRATION_DATABASE_URL=postgres://spenza:spenza@localhost:5433/spenza

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# JWT Secrets (Change these in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
JWT_REFRESH_EXPIRES_IN=7d

# Webhook Configuration
WEBHOOK_RETRY_TTL_MS=5000
WEBHOOK_MAX_ATTEMPTS=5

# CORS (Frontend URL)
CORS_ORIGIN=http://localhost:5173

# Webhook Emitter (for testing)
WEBHOOK_EMITTER_BASE_URL=http://localhost:3000
WEBHOOK_EMITTER_SUBSCRIPTION_IDS=
WEBHOOK_EMITTER_INTERVAL_MS=5000
WEBHOOK_EMITTER_PAYLOAD={"test": "data"}
```

### 3. Start Infrastructure (Docker)

Start PostgreSQL and RabbitMQ using Docker Compose:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL on port `5433`
- RabbitMQ on port `5672` (Management UI: `http://localhost:15672`)

### 4. Run Database Migrations

```bash
npm run migrate
```

### 5. Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`.

## Testing the System

### Option 1: Using the Test Server (Recommended)

The test server simulates a webhook receiver endpoint.

**Terminal 1**: Start the main server
```bash
npm run dev
```

**Terminal 2**: Start the test server
```bash
npm run test-server
# Or with custom port:
TEST_SERVER_PORT=8080 npm run test-server
```

**Terminal 3**: Emit test webhooks
```bash
npm run emit-webhooks
```

This will:
1. Create webhook events in the database
2. Queue them in RabbitMQ
3. Deliver them to the test server
4. Emit real-time updates via Socket.io

### Option 2: Manual Testing with cURL

**1. Register a user:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**2. Login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' \
  -c cookies.txt
```

**3. Create a subscription:**
```bash
curl -X POST http://localhost:3000/api/v1/subscriptions \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "My Webhook",
    "targetUrl": "http://localhost:8080/webhook",
    "isActive": true
  }'
```

**4. Send a webhook event:**
```bash
# Replace {subscription-id} with your subscription ID
curl -X POST http://localhost:3000/api/v1/webhooks/{subscription-id} \
  -H "Content-Type: application/json" \
  -d '{
    "event": "user.created",
    "data": {
      "userId": "123",
      "email": "newuser@example.com"
    }
  }'
```

**5. View events:**
```bash
curl http://localhost:3000/api/v1/subscriptions/{subscription-id}/events?page=1&limit=10 \
  -b cookies.txt
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run migrate` | Run database migrations |
| `npm run test-server` | Start test webhook receiver |
| `npm run emit-webhooks` | Emit test webhook events |

## Project Structure

```
src/
├── config/          # Database, RabbitMQ, and app configuration
├── modules/
│   ├── auth/        # Authentication (register, login, JWT)
│   ├── subscription/# Subscription management
│   └── webhook/     # Webhook ingestion and delivery
├── shared/
│   ├── middleware/  # Authentication, error handling
│   ├── services/    # Socket.io service
│   └── utils/       # Logger, token manager, error classes
├── scripts/         # Test server and webhook emitter
├── app.ts           # Express app configuration
└── server.ts        # Server bootstrap and DI

migrations/          # SQL migration files
```

## Architecture Overview

```
┌─────────────┐      ┌──────────┐      ┌────────────┐      ┌──────────┐
│   Client    │─────▶│  Express │─────▶│ PostgreSQL │      │ RabbitMQ │
│  (Webhook)  │      │   API    │      │  (Events)  │◀────▶│  Queue   │
└─────────────┘      └──────────┘      └────────────┘      └──────────┘
                           │                                      │
                           │                                      ▼
                           │                              ┌──────────────┐
                           │                              │    Worker    │
                           │                              │  (Delivery)  │
                           │                              └──────────────┘
                           │                                      │
                           ▼                                      ▼
                     ┌──────────┐                        ┌──────────────┐
                     │ Socket.io│◀───────────────────────│ Target Server│
                     │(Real-time)                        │  (Webhook)   │
                     └──────────┘                        └──────────────┘
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `RABBITMQ_URL` | RabbitMQ connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `WEBHOOK_RETRY_TTL_MS` | Retry delay in milliseconds | `5000` |
| `WEBHOOK_MAX_ATTEMPTS` | Max delivery attempts | `5` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# View PostgreSQL logs
docker logs spenza-postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### RabbitMQ Connection Issues

```bash
# Check if RabbitMQ is running
docker ps | grep rabbitmq

# Access RabbitMQ Management UI
open http://localhost:15672
# Default credentials: guest/guest

# View RabbitMQ logs
docker logs spenza-rabbitmq
```

### WebSocket Connection Issues

- Ensure `CORS_ORIGIN` matches your frontend URL
- Check that Socket.io is initialized (look for "Socket.io initialized with authentication" in logs)
- Verify JWT token is being sent in cookies

## Production Deployment

1. **Set secure environment variables**:
   - Generate strong `JWT_SECRET` and `JWT_REFRESH_SECRET`
   - Use production database credentials
   - Set `NODE_ENV=production`

2. **Build the application**:
   ```bash
   npm run build
   ```

3. **Start with PM2** (recommended):
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name spenza-backend
   ```

4. **Configure reverse proxy** (nginx/Caddy) for:
   - SSL/TLS termination
   - WebSocket upgrade support
   - Load balancing (if needed)

## License

MIT
