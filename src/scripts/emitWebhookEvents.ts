import axios from "axios";
import dotenv from "dotenv";
import { logger } from "../shared/utils/logger";

dotenv.config();

interface WebhookEmitterConfig {
  baseUrl: string;
  subscriptionIds: string[];
  intervalMs: number;
  payloadTemplate: Record<string, unknown>;
}

const getConfig = (): WebhookEmitterConfig => {
  const baseUrl =
    process.env.WEBHOOK_EMITTER_BASE_URL || "http://localhost:3000";
  const subscriptionIdsEnv = process.env.WEBHOOK_EMITTER_SUBSCRIPTION_IDS;

  if (!subscriptionIdsEnv) {
    throw new Error(
      "WEBHOOK_EMITTER_SUBSCRIPTION_IDS is required. Format: comma-separated UUIDs (e.g., 'uuid1,uuid2,uuid3')"
    );
  }

  const subscriptionIds = subscriptionIdsEnv.split(",").map((id) => id.trim());

  // Validate UUIDs
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const id of subscriptionIds) {
    if (!uuidRegex.test(id)) {
      throw new Error(`Invalid UUID format: ${id}`);
    }
  }

  const intervalMs = parseInt(
    process.env.WEBHOOK_EMITTER_INTERVAL_MS || "5000",
    10
  );

  // Default payload template - can be overridden via env
  let payloadTemplate: Record<string, unknown>;
  if (process.env.WEBHOOK_EMITTER_PAYLOAD) {
    try {
      payloadTemplate = JSON.parse(process.env.WEBHOOK_EMITTER_PAYLOAD);
    } catch (error) {
      throw new Error(
        `Invalid JSON in WEBHOOK_EMITTER_PAYLOAD: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  } else {
    payloadTemplate = {
      event: "test.event",
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook event",
        source: "webhook-emitter-script",
      },
    };
  }

  return {
    baseUrl,
    subscriptionIds,
    intervalMs,
    payloadTemplate,
  };
};

const generatePayload = (
  template: Record<string, unknown>
): Record<string, unknown> => {
  // Deep clone and inject dynamic values
  const payload = JSON.parse(JSON.stringify(template));

  // Replace timestamp if it exists
  if (payload.timestamp) {
    payload.timestamp = new Date().toISOString();
  }

  // Add a random ID for uniqueness
  payload.id = crypto.randomUUID();

  return payload;
};

const emitWebhook = async (
  baseUrl: string,
  subscriptionId: string,
  payload: Record<string, unknown>
): Promise<void> => {
  try {
    const url = `${baseUrl}/api/v1/webhooks/${subscriptionId}`;
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    logger.info(
      {
        subscriptionId,
        eventId: response.data.data?.eventId,
        status: response.status,
      },
      "Webhook event emitted successfully"
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error(
        {
          subscriptionId,
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        },
        "Failed to emit webhook event"
      );
    } else {
      logger.error(
        {
          subscriptionId,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        "Unexpected error emitting webhook"
      );
    }
  }
};

const runEmitter = async (config: WebhookEmitterConfig): Promise<void> => {
  logger.info(
    {
      baseUrl: config.baseUrl,
      subscriptionCount: config.subscriptionIds.length,
      intervalMs: config.intervalMs,
    },
    "Starting webhook emitter"
  );

  const emitToAll = async () => {
    const promises = config.subscriptionIds.map((subscriptionId) => {
      const payload = generatePayload(config.payloadTemplate);
      return emitWebhook(config.baseUrl, subscriptionId, payload);
    });

    await Promise.all(promises);
  };

  // Emit immediately on start
  await emitToAll();

  // Then emit at intervals
  setInterval(async () => {
    await emitToAll();
  }, config.intervalMs);

  logger.info(
    { intervalMs: config.intervalMs },
    "Webhook emitter running. Press Ctrl+C to stop."
  );
};

// Main execution
const main = async () => {
  try {
    const config = getConfig();
    await runEmitter(config);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(
        { message: error.message, stack: error.stack },
        "Failed to start webhook emitter"
      );
    } else {
      logger.error({ error: String(error) }, "Failed to start webhook emitter");
    }
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGINT", () => {
  logger.info("Shutting down webhook emitter...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Shutting down webhook emitter...");
  process.exit(0);
});

main();
