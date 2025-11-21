import { Router } from "express";
import { WebhookController } from "./webhook.controller";
import { validateRequest } from "../../shared/middleware/requestValidator";
import { WebhookParamsSchema } from "./webhook.schema";

export const createWebhookRouter = (controller: WebhookController): Router => {
  const router = Router();

  router.post(
    "/:subscriptionId",
    validateRequest(WebhookParamsSchema, "params"),
    controller.ingest
  );

  return router;
};
