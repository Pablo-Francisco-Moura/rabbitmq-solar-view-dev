import { getPool } from "./pool.js";
import type { GestaoSceeRow } from "../types/gestaoScee.js";

// Dado um conjunto de unidadeIds (geradoras e/ou beneficiarias misturadas),
// retorna todos os vinculos gestaoSCEE que tocam qualquer uma delas.
export async function getGestaoSceeByUnidadeIds(
  unidadeIds: number[],
): Promise<GestaoSceeRow[]> {
  if (!unidadeIds.length) return [];
  const db = getPool();
  const [rows] = await db.query<GestaoSceeRow[]>(
    `SELECT * FROM gestaoSCEE
     WHERE unidadeGeradoraId IN (?) OR unidadeBeneficiariaId IN (?)`,
    [unidadeIds, unidadeIds],
  );
  return rows;
}
