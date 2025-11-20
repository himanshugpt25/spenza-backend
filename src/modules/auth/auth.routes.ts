import { Router } from "express";
import { AuthController } from "./auth.controller";
import { validateRequest } from "../../shared/middleware/requestValidator";
import { LoginSchema, RegisterSchema } from "./auth.schema";

export const createAuthRouter = (controller: AuthController): Router => {
  const router = Router();

  router.post("/signup", validateRequest(RegisterSchema), controller.signup);

  router.post("/login", validateRequest(LoginSchema), controller.login);

  return router;
};
