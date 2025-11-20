import { z } from "zod";

export const WebhookParamsSchema = z.object({
  subscriptionId: z.string().uuid(),
});

export const IngestWebhookSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
});

export type WebhookParams = z.infer<typeof WebhookParamsSchema>;
export type IngestWebhookDto = z.infer<typeof IngestWebhookSchema>;
