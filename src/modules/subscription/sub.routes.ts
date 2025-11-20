import { Router } from "express";
import { SubscriptionController } from "./sub.controller";
import { validateRequest } from "../../shared/middleware/requestValidator";
import { CreateSubscriptionSchema } from "./sub.schema";
import { authenticate } from "../../shared/middleware/authMiddleware";

export const createSubscriptionRouter = (
  controller: SubscriptionController
): Router => {
  const router = Router();

  router.post(
    "/",
    authenticate,
    validateRequest(CreateSubscriptionSchema),
    controller.addSubscription
  );
  router.get("/", authenticate, controller.listSubscriptions);

  return router;
};
