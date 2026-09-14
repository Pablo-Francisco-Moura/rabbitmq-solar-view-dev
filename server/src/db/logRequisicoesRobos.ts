import { getLogPool } from "./logPool.js";
import type {
  LogRequisicaoRoboRow,
  TipoRequisicaoRoboRow,
} from "../types/portais.js";

export async function getTiposRequisicaoRobo(): Promise<
  TipoRequisicaoRoboRow[]
> {
  const db = getLogPool();
  const [rows] = await db.query<TipoRequisicaoRoboRow[]>(
    `SELECT * FROM tipoRequisicaoRobo ORDER BY tipoRequisicaoRoboId ASC`,
  );
  return rows;
}

// Requisicoes de robos que falharam (sucesso = 0) para um portal, filtradas
// por tipo de requisicao (tipoRequisicaoRobo: 4 status, 5 powerData, 6 energyData).
export async function getFalhasRequisicoesRobos(
  portalId: number,
  tiposRequisicao: number[],
): Promise<LogRequisicaoRoboRow[]> {
  if (!tiposRequisicao.length) return [];
  const db = getLogPool();
  const [rows] = await db.query<LogRequisicaoRoboRow[]>(
    `SELECT * FROM logRequisicoesRobos
     WHERE portal = ? AND sucesso = 0 AND requisicao IN (?)
     ORDER BY logRequisicoesRobosId ASC`,
    [portalId, tiposRequisicao],
  );
  return rows;
}
