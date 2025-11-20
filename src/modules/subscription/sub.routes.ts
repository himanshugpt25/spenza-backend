import { Router } from "express";
import { SubscriptionController } from "./sub.controller";
import { validateRequest } from "../../shared/middleware/requestValidator";
import {
  CreateSubscriptionSchema,
  SubscriptionIdSchema,
  UpdateStatusSchema,
} from "./sub.schema";

export const createSubscriptionRouter = (
  controller: SubscriptionController,
): Router => {
  const router = Router();

  router.post("/", validateRequest(CreateSubscriptionSchema), controller.create);
  router.get(
    "/:subscriptionId",
    validateRequest(SubscriptionIdSchema, "params"),
    controller.getById,
  );
  router.patch(
    "/:subscriptionId/status",
    validateRequest(SubscriptionIdSchema, "params"),
    validateRequest(UpdateStatusSchema),
    controller.toggleStatus,
  );

  return router;
};

