import { request } from "./request.js";
import type {
  UnidadeDetails,
  UnidadeJobPayload,
  UnidadeNome,
  InstallationCodesUpdate,
} from "../types/unidades.js";

export const getUnidadeNomes = (unidadeIds: number[]) =>
  request<Record<number, string>>(`/unidades/nomes?ids=${unidadeIds.join(",")}`);

export const getUnidadePayload = (unidadeId: number) =>
  request<UnidadeJobPayload>(
    `/unidades/${encodeURIComponent(unidadeId)}/job-payload`,
  );

export const getUnidadeDetails = (unidadeId: number) =>
  request<UnidadeDetails>(`/unidades/${encodeURIComponent(unidadeId)}`);

export const searchUnidadesByNome = (nome: string) =>
  request<UnidadeNome[]>(`/unidades/busca?nome=${encodeURIComponent(nome)}`);

export const updateUnidadeInstallationCodes = (
  unidadeId: number,
  codes: InstallationCodesUpdate,
) =>
  request<UnidadeDetails>(
    `/unidades/${encodeURIComponent(unidadeId)}/codigos-instalacao`,
    {
      method: "PATCH",
      body: JSON.stringify(codes),
    },
  );

export const deleteFaturaRelatorio = (unidadeId: number, faturaId: number) =>
  request<{ ok: boolean }>(
    `/unidades/${encodeURIComponent(unidadeId)}/fatura-relatorio/${encodeURIComponent(faturaId)}`,
    { method: "DELETE" },
  );
