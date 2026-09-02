async function request(path, options) {
  const response = await fetch(`/api${path}`, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Erro ${response.status}`);
  return body;
}

export const getConcessionarias = () => request("/concessionarias");

export const getQueues = () => request("/queues");

export const getMessages = (queue) =>
  request(`/queues/${encodeURIComponent(queue)}/messages`);

export const getUnidadeNomes = (unidadeIds) =>
  request(`/unidades/nomes?ids=${unidadeIds.join(",")}`);

export const getUnidadePayload = (unidadeId) =>
  request(`/unidades/${encodeURIComponent(unidadeId)}/job-payload`);

export const getUnidadeDetails = (unidadeId) =>
  request(`/unidades/${encodeURIComponent(unidadeId)}`);

export const searchUnidadesByNome = (nome) =>
  request(`/unidades/busca?nome=${encodeURIComponent(nome)}`);

export const updateUnidadeInstallationCodes = (unidadeId, codes) =>
  request(`/unidades/${encodeURIComponent(unidadeId)}/codigos-instalacao`, {
    method: "PATCH",
    body: JSON.stringify(codes),
  });

export const getGestaoScee = (unidadeIds) =>
  request(`/gestao-scee?ids=${unidadeIds.join(",")}`);

export const extractFatura = (env, companyId, url) =>
  request("/extract", {
    method: "POST",
    body: JSON.stringify({ env, companyId, url }),
  });

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
