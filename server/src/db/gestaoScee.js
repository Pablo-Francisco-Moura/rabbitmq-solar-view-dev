import { getPool } from "./pool.js";

// Dado um conjunto de unidadeIds (geradoras e/ou beneficiarias misturadas),
// retorna todos os vinculos gestaoSCEE que tocam qualquer uma delas.
export async function getGestaoSceeByUnidadeIds(unidadeIds) {
  if (!unidadeIds.length) return [];
  const db = getPool();
  const [rows] = await db.query(
    `SELECT * FROM gestaoSCEE
     WHERE unidadeGeradoraId IN (?) OR unidadeBeneficiariaId IN (?)`,
    [unidadeIds, unidadeIds],
  );
  return rows;
}
