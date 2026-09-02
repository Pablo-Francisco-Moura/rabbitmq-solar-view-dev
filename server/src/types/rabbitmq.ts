import type { GetMessage } from "amqplib";

export interface DrainedMessage {
  content: Buffer;
  properties: GetMessage["properties"];
}
