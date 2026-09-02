import amqp from "amqplib";
import type { ChannelModel, ConfirmChannel } from "amqplib";
import { concessionarias } from "./concessionarias.js";
import type { DrainedMessage } from "./types/rabbitmq.js";

const amqpUrl = process.env.AMQP_URL || "amqp://guest:guest@localhost:5672/";
const rabbitApiUrl = process.env.RABBITMQ_API_URL || "http://localhost:15672";
const rabbitUser = process.env.RABBITMQ_USER || "guest";
const rabbitPassword = process.env.RABBITMQ_PASSWORD || "guest";

let connection: ChannelModel | undefined;
let channel: ConfirmChannel | undefined;

export async function getChannel(): Promise<ConfirmChannel> {
  if (channel) return channel;
  connection = await amqp.connect(amqpUrl);
  connection.on("close", () => {
    connection = undefined;
    channel = undefined;
  });
  connection.on("error", (error: Error) =>
    console.error("RabbitMQ connection error:", error.message),
  );
  channel = await connection.createConfirmChannel();
  for (const c of concessionarias) {
    await channel.assertQueue(c.queueIn, { durable: true, maxPriority: 2 });
    await channel.assertQueue(c.queueOut, { durable: true });
  }
  return channel;
}

export function resetChannel(): void {
  channel = undefined;
}

export async function rabbitRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = Buffer.from(`${rabbitUser}:${rabbitPassword}`).toString(
    "base64",
  );
  const response = await fetch(`${rabbitApiUrl}${path}`, {
    ...options,
    headers: {
      authorization: `Basic ${token}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok)
    throw new Error(
      `RabbitMQ API ${response.status}: ${await response.text()}`,
    );
  return (await response.json()) as T;
}

export async function drainQueue(
  activeChannel: ConfirmChannel,
  queue: string,
  maxMessages = 5000,
): Promise<DrainedMessage[]> {
  const drained: DrainedMessage[] = [];
  while (drained.length < maxMessages) {
    const message = await activeChannel.get(queue, { noAck: false });
    if (!message) break;
    activeChannel.ack(message);
    drained.push({ content: message.content, properties: message.properties });
  }
  return drained;
}

export async function refillQueue(
  activeChannel: ConfirmChannel,
  queue: string,
  entries: DrainedMessage[],
): Promise<void> {
  for (const entry of entries) {
    activeChannel.sendToQueue(queue, entry.content, {
      persistent: entry.properties.deliveryMode === 2,
      priority: entry.properties.priority,
      contentType: entry.properties.contentType,
      headers: entry.properties.headers,
    });
  }
  await activeChannel.waitForConfirms();
}
