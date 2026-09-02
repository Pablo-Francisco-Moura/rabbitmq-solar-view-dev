import { Router } from "express";
import { getGestaoSceeByUnidadeIds } from "../db/gestaoScee.js";

const router = Router();

router.get("/api/gestao-scee", async (request, response) => {
  const ids = String(request.query.ids || "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
  try {
    const vinculos = await getGestaoSceeByUnidadeIds(ids);
    response.json(vinculos);
  } catch (error) {
    response.status(502).json({ error: (error as Error).message });
  }
});

export default router;
