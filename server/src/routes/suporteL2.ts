import { Router } from "express";
import { acessarContaIntegrador, getColaboradorAtual } from "../db/suporteL2.js";

const router = Router();

router.get("/api/suporte-l2/colaborador-atual", async (_request, response) => {
  try {
    const result = await getColaboradorAtual();
    response.json(result);
  } catch (error) {
    const message = (error as Error).message;
    response.status(404).json({ error: message });
  }
});

router.post(
  "/api/suporte-l2/acessar-conta-integrador",
  async (request, response) => {
    const integrador = String(request.body?.integrador ?? "").trim();
    if (!integrador)
      return response
        .status(400)
        .json({ error: "Informe o usuarioId ou o e-mail do integrador." });
    try {
      const result = await acessarContaIntegrador(integrador);
      response.json(result);
    } catch (error) {
      const message = (error as Error).message;
      const notFound = /nao encontrad/.test(message);
      const invalido = /nao e' um Integrador|ja pertence ao integrador/.test(
        message,
      );
      response
        .status(notFound ? 404 : invalido ? 422 : 502)
        .json({ error: message });
    }
  },
);

export default router;
