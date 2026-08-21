async function request(path, options) {
  const response = await fetch(`/api${path}`, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Erro ${response.status}`);
  return body;
}

export const getQueues = () => request("/queues");

export const getMessages = (queue) =>
  request(`/queues/${encodeURIComponent(queue)}/messages`);

export const publishMessage = (queue, payload, priority) =>
  request("/messages", {
    method: "POST",
    body: JSON.stringify({ queue, payload, priority }),
  });

export const deleteMessage = (queue, index, payload) =>
  request(`/queues/${encodeURIComponent(queue)}/messages/${index}`, {
    method: "DELETE",
    body: JSON.stringify({ payload }),
  });
