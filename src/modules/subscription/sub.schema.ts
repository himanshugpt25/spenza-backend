import { z } from "zod";

export const CreateSubscriptionSchema = z.object({
  targetUrl: z.string().url(),
  isActive: z.boolean().default(true),
  name: z.string().min(1),
  description: z.string().optional(),
});

export const SubscriptionIdSchema = z.object({
  subscriptionId: z.string().uuid(),
});

export type CreateSubscriptionDto = z.infer<typeof CreateSubscriptionSchema>;
export type SubscriptionIdParams = z.infer<typeof SubscriptionIdSchema>;
