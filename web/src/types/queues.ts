export interface Queue {
  name: string;
  messages: number;
  messagesReady: number;
  messagesUnacknowledged: number;
  consumers: number;
}

export interface MessageProperties {
  priority?: number;
  message_id?: string;
  [property: string]: unknown;
}

export interface QueueMessage {
  id: string;
  payload: string;
  payloadBytes: number;
  properties?: MessageProperties;
  routingKey: string;
  redelivered: boolean;
}

export interface PublishMessageResult {
  ok: boolean;
  queue: string;
  priority: number;
}
