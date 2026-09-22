import { request } from "./request.js";
import type {
  AcessarIntegradorResult,
  ColaboradorAtualResult,
} from "../types/suporteL2.js";

export const getColaboradorAtual = () =>
  request<ColaboradorAtualResult>("/suporte-l2/colaborador-atual");

// integrador aceita tanto usuario.usuarioId (numerico) quanto usuEmail.
export const acessarContaIntegrador = (integrador: string | number) =>
  request<AcessarIntegradorResult>("/suporte-l2/acessar-conta-integrador", {
    method: "POST",
    body: JSON.stringify({ integrador: String(integrador) }),
  });
