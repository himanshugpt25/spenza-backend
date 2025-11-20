import {
  Channel,
  ChannelModel,
  ConsumeMessage,
  Options,
  connect,
} from "amqplib";
import { config } from "./config";
import { logger } from "../shared/utils/logger";

type ConsumeHandler = (
  message: ConsumeMessage,
  channel: Channel
) => Promise<void>;

export class RabbitMQService {
  private connection?: ChannelModel;
  private channel?: Channel;

  async connect(): Promise<void> {
    if (this.connection) {
      return;
    }
    this.connection = await connect(config.RABBITMQ_URL);
    this.channel = await this.connection.createChannel();
    logger.info("Connected to RabbitMQ");
  }

  private ensureChannel(): Channel {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }
    return this.channel;
  }

  async assertQueue(
    queue: string,
    options?: Options.AssertQueue
  ): Promise<void> {
    const channel = this.ensureChannel();
    await channel.assertQueue(queue, {
      durable: true,
      ...options,
    });
  }

  async assertExchange(
    exchange: string,
    type: string,
    options?: Options.AssertExchange
  ): Promise<void> {
    const channel = this.ensureChannel();
    await channel.assertExchange(exchange, type, {
      durable: true,
      ...options,
    });
  }

  async bindQueue(
    queue: string,
    exchange: string,
    routingKey: string,
    args?: Record<string, unknown>
  ): Promise<void> {
    const channel = this.ensureChannel();
    await channel.bindQueue(queue, exchange, routingKey, args);
  }

  async sendToQueue(
    queue: string,
    payload: unknown,
    options?: Options.Publish
  ): Promise<boolean> {
    const channel = this.ensureChannel();
    return channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
      contentType: "application/json",
      ...options,
    });
  }

  async publish(
    exchange: string,
    routingKey: string,
    payload: unknown,
    options?: Options.Publish
  ): Promise<boolean> {
    const channel = this.ensureChannel();
    return channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
        contentType: "application/json",
        ...options,
      }
    );
  }

  async consume(queue: string, handler: ConsumeHandler): Promise<void> {
    const channel = this.ensureChannel();
    await channel.consume(
      queue,
      async (message: ConsumeMessage | null) => {
        if (!message) {
          return;
        }
        try {
          await handler(message, channel);
        } catch (error) {
          logger.error({ error }, "RabbitMQ consumer error");
          channel.nack(message, false, false);
        }
      },
      { noAck: false }
    );
  }

  async disconnect(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    logger.info("RabbitMQ connection closed");
  }
}
