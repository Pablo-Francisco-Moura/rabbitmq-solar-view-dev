import { Router } from "express";
import {
  getUnidadeJobPayload,
  getUnidadeNomes,
  getUnidadeDetails,
  updateUnidadeInstallationCodes,
  searchUnidadesByNome,
  deleteFaturaRelatorio,
  unlockRawFatura,
} from "../db/unidades.js";
import type { InstallationCodesRequestBody } from "../types/unidades.js";

const router = Router();

router.get("/api/unidades/nomes", async (request, response) => {
  const ids = String(request.query.ids || "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
  try {
    const nomes = await getUnidadeNomes(ids);
    response.json(nomes);
  } catch (error) {
    response.status(502).json({ error: (error as Error).message });
  }
});

router.get("/api/unidades/busca", async (request, response) => {
  const nome = String(request.query.nome || "").trim();
  if (!nome) return response.status(400).json({ error: "nome invalido." });
  try {
    const unidades = await searchUnidadesByNome(nome);
    response.json(unidades);
  } catch (error) {
    response.status(502).json({ error: (error as Error).message });
  }
});

router.get("/api/unidades/:unidadeId", async (request, response) => {
  const unidadeId = Number(request.params.unidadeId);
  if (!Number.isInteger(unidadeId) || unidadeId <= 0)
    return response.status(400).json({ error: "unidadeId invalido." });
  try {
    const details = await getUnidadeDetails(unidadeId);
    response.json(details);
  } catch (error) {
    const message = (error as Error).message;
    const notFound = /nao encontrad/.test(message);
    response.status(notFound ? 404 : 502).json({ error: message });
  }
});

router.patch(
  "/api/unidades/:unidadeId/codigos-instalacao",
  async (request, response) => {
    const unidadeId = Number(request.params.unidadeId);
    if (!Number.isInteger(unidadeId) || unidadeId <= 0)
      return response.status(400).json({ error: "unidadeId invalido." });
    const { faturaCodigoInstalacao, faturaNewCodigoInstalacao } =
      (request.body || {}) as InstallationCodesRequestBody;
    if (
      (faturaCodigoInstalacao != null &&
        typeof faturaCodigoInstalacao !== "string") ||
      (faturaNewCodigoInstalacao != null &&
        typeof faturaNewCodigoInstalacao !== "string")
    )
      return response
        .status(400)
        .json({ error: "Codigos devem ser texto." });
    try {
      const details = await updateUnidadeInstallationCodes(unidadeId, {
        faturaCodigoInstalacao: faturaCodigoInstalacao ?? null,
        faturaNewCodigoInstalacao: faturaNewCodigoInstalacao ?? null,
      });
      response.json(details);
    } catch (error) {
      const message = (error as Error).message;
      const notFound = /nao encontrad/.test(message);
      response.status(notFound ? 404 : 502).json({ error: message });
    }
  },
);

router.delete(
  "/api/unidades/:unidadeId/fatura-relatorio/:faturaId",
  async (request, response) => {
    const unidadeId = Number(request.params.unidadeId);
    const faturaId = Number(request.params.faturaId);
    if (!Number.isInteger(unidadeId) || unidadeId <= 0)
      return response.status(400).json({ error: "unidadeId invalido." });
    if (!Number.isInteger(faturaId) || faturaId <= 0)
      return response.status(400).json({ error: "faturaId invalido." });
    try {
      await deleteFaturaRelatorio(unidadeId, faturaId);
      response.json({ ok: true });
    } catch (error) {
      const message = (error as Error).message;
      const notFound = /nao encontrad/.test(message);
      response.status(notFound ? 404 : 502).json({ error: message });
    }
  },
);

router.post(
  "/api/unidades/:unidadeId/raw-faturas/:rawFaturaId/destravar",
  async (request, response) => {
    const unidadeId = Number(request.params.unidadeId);
    const rawFaturaId = Number(request.params.rawFaturaId);
    if (!Number.isInteger(unidadeId) || unidadeId <= 0)
      return response.status(400).json({ error: "unidadeId invalido." });
    if (!Number.isInteger(rawFaturaId) || rawFaturaId <= 0)
      return response.status(400).json({ error: "rawFaturaId invalido." });
    try {
      const rawFatura = await unlockRawFatura(unidadeId, rawFaturaId);
      response.json({ ok: true, rawFatura });
    } catch (error) {
      const message = (error as Error).message;
      const notFound = /nao encontrad/.test(message);
      response.status(notFound ? 404 : 502).json({ error: message });
    }
  },
);

router.get("/api/unidades/:unidadeId/job-payload", async (request, response) => {
  const unidadeId = Number(request.params.unidadeId);
  if (!Number.isInteger(unidadeId) || unidadeId <= 0)
    return response.status(400).json({ error: "unidadeId invalido." });
  try {
    const payload = await getUnidadeJobPayload(unidadeId);
    response.json(payload);
  } catch (error) {
    const message = (error as Error).message;
    const notFound = /nao encontrad/.test(message);
    response.status(notFound ? 404 : 502).json({ error: message });
  }
});

export default router;
