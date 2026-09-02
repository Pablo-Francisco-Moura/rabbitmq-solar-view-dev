export interface QueueDetail {
  name: string;
  messages: number;
  messagesReady: number;
  messagesUnacknowledged: number;
  consumers: number;
}

// Formas devolvidas pela API de management do RabbitMQ (so os campos usados).
export interface RabbitManagementQueue {
  messages_ready?: number;
  messages_unacknowledged?: number;
  consumers?: number;
}

export interface RabbitManagementMessage {
  payload: string;
  payload_bytes: number;
  properties?: { message_id?: string };
  routing_key: string;
  redelivered: boolean;
}

export interface QueueMessage {
  id: string;
  payload: string;
  payloadBytes: number;
  properties: RabbitManagementMessage["properties"];
  routingKey: string;
  redelivered: boolean;
}

export interface PublishMessageBody {
  queue?: string;
  payload?: Record<string, unknown>;
  priority?: number;
}

export interface DeleteMessageBody {
  payload?: string;
}
