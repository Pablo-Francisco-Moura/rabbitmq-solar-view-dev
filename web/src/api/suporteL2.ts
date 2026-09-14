import { request } from "./request.js";
import type { AcessarIntegradorResult } from "../types/suporteL2.js";

export const acessarContaIntegrador = (integradorUsuarioId: number) =>
  request<AcessarIntegradorResult>("/suporte-l2/acessar-conta-integrador", {
    method: "POST",
    body: JSON.stringify({ integradorUsuarioId }),
  });
