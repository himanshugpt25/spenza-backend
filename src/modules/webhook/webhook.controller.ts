import { Request, Response } from "express";
import { IWebhookService } from "./webhook.service";
import {
  IngestWebhookDto,
  WebhookParams,
} from "./webhook.schema";
import { formatSuccess } from "../../shared/utils/responseFormatter";

export class WebhookController {
  constructor(private readonly webhookService: IWebhookService) {}

  ingest = async (req: Request, res: Response) => {
    const payload = req.body as IngestWebhookDto;
    const { subscriptionId } = req.params as WebhookParams;
    const result = await this.webhookService.ingest(subscriptionId, payload);
    res
      .status(202)
      .json(formatSuccess(result, "Webhook accepted for processing"));
  };
}

