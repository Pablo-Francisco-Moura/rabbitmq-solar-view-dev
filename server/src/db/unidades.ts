import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getPool } from "./pool.js";
import type {
  UnidadeJobPayloadRow,
  IntegradorIdRow,
  UnidadeNomeRow,
  UnidadeRow,
  FaturaCredencialRow,
  FaturaRelatorioEnergeticoRow,
  ConcessionariaRow,
  UsuarioRow,
  UnidadeJobPayload,
  UnidadeDetails,
  InstallationCodesUpdate,
} from "../types/unidades.js";

// Espelha o job publicado hoje manualmente nas filas idc_*: dado o unidadeId,
// busca fatura credencial + unidade e resolve o integradorId via
// integrador.usuario_usuarioId = unidade.uniIntegradorResponsavel (esse ultimo
// e' um usuarioId, nao um integradorId).
export async function getUnidadeJobPayload(
  unidadeId: number,
): Promise<UnidadeJobPayload> {
  const db = getPool();

  const [unidadeRows] = await db.query<UnidadeJobPayloadRow[]>(
    `SELECT unidadeId, uniIntegradorResponsavel, proprietario_usuarioId,
            concessionaria_concessionariaId, uniConcessionaria, grupo_tarifario
     FROM unidade
     WHERE unidadeId = ?`,
    [unidadeId],
  );
  const unidade = unidadeRows[0];
  if (!unidade) throw new Error(`Unidade ${unidadeId} nao encontrada.`);

  const [credencialRows] = await db.query<FaturaCredencialRow[]>(
    `SELECT * FROM faturaCredencial
     WHERE unidade_unidadeId = ?
     ORDER BY faturaCredencialId DESC
     LIMIT 1`,
    [unidadeId],
  );
  const credencial = credencialRows[0];
  if (!credencial)
    throw new Error(
      `Nenhuma faturaCredencial encontrada para a unidade ${unidadeId}.`,
    );

  const [integradorRows] = await db.query<IntegradorIdRow[]>(
    `SELECT integradorId FROM integrador WHERE usuario_usuarioId = ?`,
    [unidade.uniIntegradorResponsavel],
  );
  const integrador = integradorRows[0];
  if (!integrador)
    throw new Error(
      `Integrador nao encontrado para o usuario ${unidade.uniIntegradorResponsavel} (uniIntegradorResponsavel da unidade ${unidadeId}).`,
    );

  return {
    companyId: unidade.concessionaria_concessionariaId,
    credential: {
      id: credencial.faturaCredencialId,
      username: credencial.user,
      password: credencial.password,
      birthdate: credencial.birthdate,
      cpf: credencial.cpf,
      statusCredencial: credencial.statusCredencial,
      installationCode: credencial.faturaCodigoInstalacao,
      newInstallationNumber: credencial.faturaNewCodigoInstalacao,
      clientCode: credencial.faturaCodigoCliente,
      contractCode: credencial.faturaCodigoContrato,
      isCompany: credencial.tipoPessoa,
      userId: unidade.proprietario_usuarioId,
      unityId: unidade.unidadeId,
      integratorId: integrador.integradorId,
      concessionaireName: unidade.uniConcessionaria,
      tariffGroup: unidade.grupo_tarifario,
      email: credencial.email,
    },
    dev: false,
    base64: true,
    isPortalAuth: false,
    priority: 0,
  };
}

export async function getUnidadeDetails(
  unidadeId: number,
): Promise<UnidadeDetails> {
  const db = getPool();

  const [unidadeRows] = await db.query<UnidadeRow[]>(
    `SELECT * FROM unidade WHERE unidadeId = ?`,
    [unidadeId],
  );
  const unidade = unidadeRows[0];
  if (!unidade) throw new Error(`Unidade ${unidadeId} nao encontrada.`);

  const [credencialRows] = await db.query<FaturaCredencialRow[]>(
    `SELECT * FROM faturaCredencial
     WHERE unidade_unidadeId = ?
     ORDER BY faturaCredencialId DESC
     LIMIT 1`,
    [unidadeId],
  );

  const [relatorioRows] = await db.query<FaturaRelatorioEnergeticoRow[]>(
    `SELECT * FROM faturaRelatorioEnergetico fre
     WHERE fre.unidade_unidadeId = ?
     ORDER BY fre.faturaMesReferencia DESC`,
    [unidadeId],
  );

  let concessionaria: ConcessionariaRow | null = null;
  if (unidade.concessionaria_concessionariaId != null) {
    const [concessionariaRows] = await db.query<ConcessionariaRow[]>(
      `SELECT * FROM concessionaria WHERE concessionariaId = ?`,
      [unidade.concessionaria_concessionariaId],
    );
    concessionaria = concessionariaRows[0] || null;
  }

  // unidade.uniIntegradorResponsavel guarda um usuarioId (nao um integradorId
  // - ver getUnidadeJobPayload acima), entao o integrador e' o usuario dono
  // desse id.
  let integrador: UsuarioRow | null = null;
  if (unidade.uniIntegradorResponsavel != null) {
    const [integradorRows] = await db.query<UsuarioRow[]>(
      `SELECT * FROM usuario WHERE usuarioId = ?`,
      [unidade.uniIntegradorResponsavel],
    );
    integrador = integradorRows[0] || null;
  }

  return {
    unidade,
    faturaCredencial: credencialRows[0] || null,
    faturaRelatorioEnergetico: relatorioRows,
    concessionaria,
    integrador,
  };
}

// Unico update permitido por essa tela: codigo de instalacao e novo codigo de
// instalacao, replicado em unidade e faturaCredencial para a mesma unidade.
export async function updateUnidadeInstallationCodes(
  unidadeId: number,
  { faturaCodigoInstalacao, faturaNewCodigoInstalacao }: InstallationCodesUpdate,
): Promise<UnidadeDetails> {
  const db = getPool();

  const [unidadeResult] = await db.query<ResultSetHeader>(
    `UPDATE unidade SET faturaCodigoInstalacao = ?, faturaNewCodigoInstalacao = ? WHERE unidadeId = ?`,
    [faturaCodigoInstalacao, faturaNewCodigoInstalacao, unidadeId],
  );
  if (unidadeResult.affectedRows === 0)
    throw new Error(`Unidade ${unidadeId} nao encontrada.`);

  await db.query(
    `UPDATE faturaCredencial SET faturaCodigoInstalacao = ?, faturaNewCodigoInstalacao = ? WHERE unidade_unidadeId = ?`,
    [faturaCodigoInstalacao, faturaNewCodigoInstalacao, unidadeId],
  );

  return getUnidadeDetails(unidadeId);
}

// Apaga uma fatura de faturaRelatorioEnergetico e, antes disso, os registros
// de relatorioEnergetico vinculados a ela (fatura_faturaId), ja que essa FK e'
// ON DELETE RESTRICT e bloquearia o delete direto. Roda em transacao pra nao
// deixar filho apagado com pai intacto (ou vice-versa) se algo falhar no meio.
export async function deleteFaturaRelatorio(
  unidadeId: number,
  faturaId: number,
): Promise<void> {
  const db = getPool();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [faturaRows] = await connection.query<RowDataPacket[]>(
      `SELECT faturaId FROM faturaRelatorioEnergetico WHERE faturaId = ? AND unidade_unidadeId = ?`,
      [faturaId, unidadeId],
    );
    if (faturaRows.length === 0)
      throw new Error(
        `Fatura ${faturaId} nao encontrada para a unidade ${unidadeId}.`,
      );

    await connection.query(
      `DELETE FROM relatorioEnergetico WHERE fatura_faturaId = ?`,
      [faturaId],
    );

    const [result] = await connection.query<ResultSetHeader>(
      `DELETE FROM faturaRelatorioEnergetico WHERE faturaId = ? AND unidade_unidadeId = ?`,
      [faturaId, unidadeId],
    );
    if (result.affectedRows === 0)
      throw new Error(
        `Fatura ${faturaId} nao encontrada para a unidade ${unidadeId}.`,
      );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Usado so para exibicao (titulo da mensagem na UI) — nunca entra no payload do job.
export async function getUnidadeNomes(
  unidadeIds: number[],
): Promise<Record<number, string>> {
  if (!unidadeIds.length) return {};
  const db = getPool();
  const [rows] = await db.query<UnidadeNomeRow[]>(
    `SELECT unidadeId, uniNome FROM unidade WHERE unidadeId IN (?)`,
    [unidadeIds],
  );
  const nomes: Record<number, string> = {};
  for (const row of rows) nomes[row.unidadeId] = row.uniNome;
  return nomes;
}

// Busca por nome (LIKE parcial), acionada na UI quando o usuario digita o nome
// entre aspas duplas em vez de um unidadeId.
export async function searchUnidadesByNome(
  nome: string,
): Promise<UnidadeNomeRow[]> {
  const db = getPool();
  const [rows] = await db.query<UnidadeNomeRow[]>(
    `SELECT unidadeId, uniNome FROM unidade WHERE uniNome LIKE ? ORDER BY uniNome LIMIT 200`,
    [`%${nome}%`],
  );
  return rows;
}
