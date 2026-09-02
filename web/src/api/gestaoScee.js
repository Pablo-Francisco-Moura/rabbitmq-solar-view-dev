import { request } from "./request.js";

export const getGestaoScee = (unidadeIds) =>
  request(`/gestao-scee?ids=${unidadeIds.join(",")}`);
