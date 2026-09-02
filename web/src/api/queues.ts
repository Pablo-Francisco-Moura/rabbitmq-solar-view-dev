import { request } from "./request.js";
import type { Queue, QueueMessage, PublishMessageResult } from "../types/queues.js";

export const getQueues = () => request<Queue[]>("/queues");

export const getMessages = (queue: string) =>
  request<QueueMessage[]>(`/queues/${encodeURIComponent(queue)}/messages`);

export const publishMessage = (
  queue: string,
  payload: Record<string, unknown>,
  priority: number,
) =>
  request<PublishMessageResult>("/messages", {
    method: "POST",
    body: JSON.stringify({ queue, payload, priority }),
  });

export const deleteMessage = (queue: string, index: number, payload: string) =>
  request<{ ok: boolean }>(
    `/queues/${encodeURIComponent(queue)}/messages/${index}`,
    {
      method: "DELETE",
      body: JSON.stringify({ payload }),
    },
  );
