import { z } from "zod";

export const WebhookParamsSchema = z.object({
  subscriptionId: z.string().uuid(),
});

export const IngestWebhookSchema = z.object({
  eventType: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export type WebhookParams = z.infer<typeof WebhookParamsSchema>;
export type IngestWebhookDto = z.infer<typeof IngestWebhookSchema>;

