import { request } from "./request.js";
import type {
  LogRequisicaoRobo,
  Portal,
  TipoRequisicaoRobo,
} from "../types/portais.js";

export const getPortais = () => request<Portal[]>("/portais");

export const getTiposRequisicaoRobo = () =>
  request<TipoRequisicaoRobo[]>("/portais/tipos-requisicao");

export const getMetricasPortal = (portalId: number, tipos: number[]) =>
  request<LogRequisicaoRobo[]>(
    `/portais/${portalId}/metricas?tipos=${tipos.join(",")}`,
  );
