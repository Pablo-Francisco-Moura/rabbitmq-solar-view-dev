import { Router } from "express";

const extractApiUrls = {
  local: process.env.EXTRACT_API_URL_LOCAL || "http://localhost:4001",
  prod: process.env.EXTRACT_API_URL_PROD || "http://idc.solarview.com.br:4001",
};

const router = Router();

router.post("/api/extract", async (request, response) => {
  const { env, url, companyId } = request.body || {};
  const baseUrl = extractApiUrls[env];
  if (!baseUrl)
    return response
      .status(400)
      .json({ error: `Ambiente de extracao invalido: ${env}` });
  const companyIdNumber = Number(companyId);
  if (!url || typeof url !== "string" || !Number.isInteger(companyIdNumber))
    return response
      .status(400)
      .json({ error: "url e companyId sao obrigatorios." });
  try {
    const extractResponse = await fetch(`${baseUrl}/extract`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, companyId: companyIdNumber }),
    });
    const text = await extractResponse.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || `Erro ${extractResponse.status}` };
    }
    response.status(extractResponse.status).json(data);
  } catch (error) {
    const detail = error.cause?.code || error.cause?.message;
    response.status(502).json({
      error: detail
        ? `Falha ao conectar em ${baseUrl}/extract: ${detail}`
        : error.message,
    });
  }
});

export default router;
