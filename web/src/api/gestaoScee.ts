import { request } from "./request.js";
import type { GestaoSceeVinculo } from "../types/gestaoScee.js";

export const getGestaoScee = (unidadeIds: number[]) =>
  request<GestaoSceeVinculo[]>(`/gestao-scee?ids=${unidadeIds.join(",")}`);
