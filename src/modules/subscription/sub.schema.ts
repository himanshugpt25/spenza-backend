import { z } from "zod";

export const CreateSubscriptionSchema = z.object({
  name: z.string().min(1),
  callbackUrl: z.string().url(),
  isActive: z.boolean().default(true),
});

export const SubscriptionIdSchema = z.object({
  subscriptionId: z.string().uuid(),
});

export const UpdateStatusSchema = z.object({
  isActive: z.boolean(),
});

export type CreateSubscriptionDto = z.infer<typeof CreateSubscriptionSchema>;
export type SubscriptionIdParams = z.infer<typeof SubscriptionIdSchema>;
export type UpdateStatusDto = z.infer<typeof UpdateStatusSchema>;

