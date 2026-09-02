import { Router } from "express";
import { queues } from "../concessionarias.js";
import {
  getChannel,
  resetChannel,
  rabbitRequest,
  drainQueue,
  refillQueue,
} from "../rabbitmq.js";
import type {
  QueueDetail,
  RabbitManagementQueue,
  RabbitManagementMessage,
  QueueMessage,
  PublishMessageBody,
  DeleteMessageBody,
} from "../types/queues.js";

const router = Router();

router.get("/api/health", async (_request, response) => {
  try {
    await getChannel();
    response.json({ ok: true, queues });
  } catch (error) {
    response.status(503).json({ ok: false, error: (error as Error).message });
  }
});

router.get("/api/queues", async (_request, response) => {
  try {
    const activeChannel = await getChannel();
    const details: QueueDetail[] = await Promise.all(
      queues.map(async (queue) => {
        const [data, brokerData] = await Promise.all([
          rabbitRequest<RabbitManagementQueue>(
            `/api/queues/%2F/${encodeURIComponent(queue)}`,
          ),
          activeChannel.checkQueue(queue),
        ]);
        const messagesReady = brokerData.messageCount ?? data.messages_ready ?? 0;
        return {
          name: queue,
          messages: messagesReady + (data.messages_unacknowledged ?? 0),
          messagesReady,
          messagesUnacknowledged: data.messages_unacknowledged ?? 0,
          consumers: data.consumers ?? 0,
        };
      }),
    );
    response.json(details);
  } catch (error) {
    response.status(502).json({ error: (error as Error).message });
  }
});

router.get("/api/queues/:queue/messages", async (request, response) => {
  const { queue } = request.params;
  if (!queues.includes(queue))
    return response.status(404).json({ error: "Fila nao configurada." });
  try {
    const messages = await rabbitRequest<RabbitManagementMessage[]>(
      `/api/queues/%2F/${encodeURIComponent(queue)}/get`,
      {
        method: "POST",
        body: JSON.stringify({
          count: 25,
          ackmode: "ack_requeue_true",
          encoding: "auto",
          truncate: 50000,
        }),
      },
    );
    const result: QueueMessage[] = messages.map((item, index) => ({
      id: `${queue}-${index}-${item.properties?.message_id || ""}`,
      payload: item.payload,
      payloadBytes: item.payload_bytes,
      properties: item.properties,
      routingKey: item.routing_key,
      redelivered: item.redelivered,
    }));
    response.json(result);
  } catch (error) {
    response.status(502).json({ error: (error as Error).message });
  }
});

router.delete("/api/queues/:queue/messages/:index", async (request, response) => {
  const { queue, index } = request.params;
  const { payload } = (request.body || {}) as DeleteMessageBody;
  if (!queues.includes(queue))
    return response.status(404).json({ error: "Fila nao configurada." });
  const targetIndex = Number(index);
  if (!Number.isInteger(targetIndex) || targetIndex < 0)
    return response.status(400).json({ error: "Indice invalido." });

  try {
    const activeChannel = await getChannel();
    const drained = await drainQueue(activeChannel, queue);
    const target = drained[targetIndex];
    const matches =
      target && (payload == null || target.content.toString("utf8") === payload);

    if (!matches) {
      await refillQueue(activeChannel, queue, drained);
      return response.status(409).json({
        error: "A fila mudou desde a ultima leitura. Atualize e tente de novo.",
      });
    }

    drained.splice(targetIndex, 1);
    await refillQueue(activeChannel, queue, drained);
    response.json({ ok: true });
  } catch (error) {
    resetChannel();
    response.status(503).json({ error: (error as Error).message });
  }
});

router.post("/api/messages", async (request, response) => {
  const { queue, payload, priority = 0 } = (request.body || {}) as PublishMessageBody;
  if (!queue || !queues.includes(queue))
    return response.status(400).json({ error: "Fila nao configurada." });
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return response
      .status(400)
      .json({ error: "Payload deve ser um objeto JSON." });
  const safePriority = Math.max(0, Math.min(2, Number(priority) || 0));
  try {
    const activeChannel = await getChannel();
    activeChannel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
      priority: safePriority,
      contentType: "application/json",
    });
    await activeChannel.waitForConfirms();
    response.status(201).json({ ok: true, queue, priority: safePriority });
  } catch (error) {
    resetChannel();
    response.status(503).json({ error: (error as Error).message });
  }
});

export default router;
