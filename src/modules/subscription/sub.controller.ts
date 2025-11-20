import { Request, Response } from "express";
import {
  CreateSubscriptionDto,
  SubscriptionIdParams,
  UpdateStatusDto,
} from "./sub.schema";
import { ISubscriptionService } from "./sub.service";
import { formatSuccess } from "../../shared/utils/responseFormatter";

export class SubscriptionController {
  constructor(private readonly subscriptionService: ISubscriptionService) {}

  create = async (req: Request, res: Response) => {
    const payload = req.body as CreateSubscriptionDto;
    const result = await this.subscriptionService.create(payload);
    res.status(201).json(formatSuccess(result, "Subscription created"));
  };

  getById = async (req: Request, res: Response) => {
    const { subscriptionId } = req.params as SubscriptionIdParams;
    const result = await this.subscriptionService.getById(subscriptionId);
    res.status(200).json(formatSuccess(result));
  };

  toggleStatus = async (req: Request, res: Response) => {
    const { subscriptionId } = req.params as SubscriptionIdParams;
    const { isActive } = req.body as UpdateStatusDto;
    const result = await this.subscriptionService.toggleStatus(
      subscriptionId,
      isActive,
    );
    res.status(200).json(formatSuccess(result, "Subscription updated"));
  };
}

