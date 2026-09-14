import { Router } from "express";
import { getPortais } from "../db/portais.js";
import {
  getFalhasRequisicoesRobos,
  getTiposRequisicaoRobo,
} from "../db/logRequisicoesRobos.js";

const router = Router();

router.get("/api/portais", async (_request, response) => {
  try {
    const portais = await getPortais();
    response.json(portais);
  } catch (error) {
    response.status(502).json({ error: (error as Error).message });
  }
});

router.get("/api/portais/tipos-requisicao", async (_request, response) => {
  try {
    const tipos = await getTiposRequisicaoRobo();
    response.json(tipos);
  } catch (error) {
    response.status(502).json({ error: (error as Error).message });
  }
});

router.get("/api/portais/:portalId/metricas", async (request, response) => {
  const portalId = Number(request.params.portalId);
  if (!Number.isInteger(portalId) || portalId <= 0) {
    response.status(400).json({ error: "portalId inválido" });
    return;
  }
  const tipos = String(request.query.tipos || "")
    .split(",")
    .map((tipo) => Number(tipo.trim()))
    .filter((tipo) => Number.isInteger(tipo) && tipo > 0);
  try {
    const falhas = await getFalhasRequisicoesRobos(portalId, tipos);
    response.json(falhas);
  } catch (error) {
    response.status(502).json({ error: (error as Error).message });
  }
});

export default router;
