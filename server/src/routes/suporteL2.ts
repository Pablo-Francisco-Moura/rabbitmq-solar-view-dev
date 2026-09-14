import { Router } from "express";
import { acessarContaIntegrador } from "../db/suporteL2.js";

const router = Router();

router.post(
  "/api/suporte-l2/acessar-conta-integrador",
  async (request, response) => {
    const integradorUsuarioId = Number(request.body?.integradorUsuarioId);
    if (!Number.isInteger(integradorUsuarioId) || integradorUsuarioId <= 0)
      return response
        .status(400)
        .json({ error: "integradorUsuarioId invalido." });
    try {
      const result = await acessarContaIntegrador(integradorUsuarioId);
      response.json(result);
    } catch (error) {
      const message = (error as Error).message;
      const notFound = /nao encontrad/.test(message);
      const invalido = /nao e' um Integrador/.test(message);
      response
        .status(notFound ? 404 : invalido ? 422 : 502)
        .json({ error: message });
    }
  },
);

export default router;
