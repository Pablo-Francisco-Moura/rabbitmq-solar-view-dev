import { request } from "./request.js";

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
