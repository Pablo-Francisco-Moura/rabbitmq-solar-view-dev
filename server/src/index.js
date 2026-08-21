import express from "express";
import cors from "cors";
import amqp from "amqplib";

const app = express();
const port = Number(process.env.PORT || 3000);
const amqpUrl = process.env.AMQP_URL || "amqp://guest:guest@localhost:5672/";
const rabbitApiUrl = process.env.RABBITMQ_API_URL || "http://localhost:15672";
const rabbitUser = process.env.RABBITMQ_USER || "guest";
const rabbitPassword = process.env.RABBITMQ_PASSWORD || "guest";
const queues = [
  process.env.QUEUE_IN_NAME || "idc_equatorial_go_in",
  process.env.QUEUE_OUT_NAME || "idc_equatorial_go_out",
];

let connection;
let channel;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

async function getChannel() {
  if (channel) return channel;
  connection = await amqp.connect(amqpUrl);
  connection.on("close", () => {
    connection = undefined;
    channel = undefined;
  });
  connection.on("error", (error) =>
    console.error("RabbitMQ connection error:", error.message),
  );
  channel = await connection.createConfirmChannel();
  await channel.assertQueue(queues[0], { durable: true, maxPriority: 2 });
  await channel.assertQueue(queues[1], { durable: true });
  return channel;
}

async function rabbitRequest(path, options = {}) {
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
  return response.json();
}

app.get("/api/health", async (_request, response) => {
  try {
    await getChannel();
    response.json({ ok: true, queues });
  } catch (error) {
    response.status(503).json({ ok: false, error: error.message });
  }
});

app.get("/api/queues", async (_request, response) => {
  try {
    const details = await Promise.all(
      queues.map(async (queue) => {
        const data = await rabbitRequest(
          `/api/queues/%2F/${encodeURIComponent(queue)}`,
        );
        return {
          name: queue,
          messages: data.messages ?? 0,
          messagesReady: data.messages_ready ?? 0,
          messagesUnacknowledged: data.messages_unacknowledged ?? 0,
          consumers: data.consumers ?? 0,
        };
      }),
    );
    response.json(details);
  } catch (error) {
    response.status(502).json({ error: error.message });
  }
});

app.get("/api/queues/:queue/messages", async (request, response) => {
  const { queue } = request.params;
  if (!queues.includes(queue))
    return response.status(404).json({ error: "Fila nao configurada." });
  try {
    const messages = await rabbitRequest(
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
    response.json(
      messages.map((item, index) => ({
        id: `${queue}-${index}-${item.properties?.message_id || ""}`,
        payload: item.payload,
        payloadBytes: item.payload_bytes,
        properties: item.properties,
        routingKey: item.routing_key,
        redelivered: item.redelivered,
      })),
    );
  } catch (error) {
    response.status(502).json({ error: error.message });
  }
});

app.post("/api/messages", async (request, response) => {
  const { queue, payload, priority = 0 } = request.body || {};
  if (!queues.includes(queue))
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
    channel = undefined;
    response.status(503).json({ error: error.message });
  }
});

app.listen(port, () =>
  console.log(`RabbitMQ Solar View Dev API ouvindo em :${port}`),
);
