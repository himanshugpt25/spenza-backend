import { Response, RequestHandler } from "express";
import { CreateSubscriptionDto } from "./sub.schema";
import { ISubscriptionService } from "./sub.service";
import { formatSuccess } from "../../shared/utils/responseFormatter";
import { AuthenticatedRequest } from "../../shared/types/express";

export class SubscriptionController {
  constructor(private readonly subscriptionService: ISubscriptionService) {}

  addSubscription: RequestHandler = async (req, res) => {
    const typedReq = req as AuthenticatedRequest;
    const payload = req.body as CreateSubscriptionDto;
    const result = await this.subscriptionService.addSubscription(
      typedReq.user.id,
      payload
    );
    res.status(201).json(formatSuccess(result, "Subscription created"));
  };

  listSubscriptions: RequestHandler = async (req, res) => {
    const typedReq = req as AuthenticatedRequest;
    const result = await this.subscriptionService.listSubscriptions(
      typedReq.user.id
    );
    res.status(200).json(formatSuccess(result));
  };
}
