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
  UnidadeTerceiraRow,
  CredencialRow,
  StatusIntegracaoRow,
  UnidadeJobPayload,
  UnidadeDetails,
  InstallationCodesUpdate,
  RawFaturaRow,
} from "../types/unidades.js";
import type { PortalRow } from "../types/portais.js";

const RAW_FATURA_COLUMNS = `id, raw_coleta_id, concessionaria_id, unidade_id, url, data_referencia,
       status, etapa, tentativas, erro_processamento, fatura_id,
       primeiro_visto_em, ultimo_visto_em, vezes_visto`;

// Faturas ja baixadas pro S3 pelo crawler (raw_faturas) para a unidade — pode
// ter linhas aqui sem contrapartida em faturaRelatorioEnergetico quando a
// extracao ainda nao rodou ou falhou (fatura_id null nesse caso).
export async function getRawFaturasByUnidade(
  unidadeId: number,
): Promise<RawFaturaRow[]> {
  const db = getPool();
  const [rows] = await db.query<RawFaturaRow[]>(
    `SELECT ${RAW_FATURA_COLUMNS}
     FROM raw_faturas
     WHERE unidade_id = ?
     ORDER BY data_referencia DESC, id DESC`,
    [unidadeId],
  );
  return rows;
}

// "Destrava" uma raw_fatura presa em status='error': o job de extracao
// (ExtractRawFaturasTask, em solarview_api_3.0) so pega linhas com
// status='pending', entao error e' terminal ate alguem resetar assim — sem
// isso a fatura fica no S3 pra sempre sem nunca virar uma linha em
// faturaRelatorioEnergetico. Zera tentativas tambem pra ela ter o orcamento
// de retry completo de novo, nao cair direto em error de novo na primeira
// falha subsequente.
//
// CRITICO: tambem zera extracao_id. O job so dispara uma extracao nova
// (resolveExtraction em extract-raw-faturas-task.ts) quando o extracao_id
// linkado esta ausente ou aponta pra uma extracao cujo status e' 'error' —
// uma extracao que so falhou na validacao de negocio (_isValid:false, ex.:
// o bug do faturaModalidadeTarifaria) fica com status 'done' na tabela
// raw_extracao_fatura, entao sem isso o job so re-le pra sempre o MESMO
// resultado velho e invalido, nunca chama o idc_api_extract de novo — mesmo
// depois do fix estar deployado.
export async function unlockRawFatura(
  unidadeId: number,
  rawFaturaId: number,
): Promise<RawFaturaRow> {
  const db = getPool();
  const [result] = await db.query<ResultSetHeader>(
    `UPDATE raw_faturas
     SET status = 'pending', proxima_tentativa_em = NULL, erro_processamento = NULL,
         tentativas = 0, extracao_id = NULL
     WHERE id = ? AND unidade_id = ? AND status = 'error'`,
    [rawFaturaId, unidadeId],
  );
  if (result.affectedRows === 0)
    throw new Error(
      `raw_fatura ${rawFaturaId} nao encontrada (ou nao esta em erro) para a unidade ${unidadeId}.`,
    );

  const [rows] = await db.query<RawFaturaRow[]>(
    `SELECT ${RAW_FATURA_COLUMNS} FROM raw_faturas WHERE id = ?`,
    [rawFaturaId],
  );
  return rows[0];
}

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

  const rawFaturas = await getRawFaturasByUnidade(unidadeId);

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

  const [unidadeTerceiraRows] = await db.query<UnidadeTerceiraRow[]>(
    `SELECT * FROM unidadesTerceiras WHERE unidadesTerceiras_unidadeId = ?`,
    [unidadeId],
  );
  const unidadeTerceira = unidadeTerceiraRows[0] || null;

  let credencialUsina: CredencialRow | null = null;
  if (unidadeTerceira?.unidadesTerceiras_credencialId != null) {
    const [credencialUsinaRows] = await db.query<CredencialRow[]>(
      `SELECT * FROM credencial WHERE credencialId = ?`,
      [unidadeTerceira.unidadesTerceiras_credencialId],
    );
    credencialUsina = credencialUsinaRows[0] || null;
  }

  let portal: PortalRow | null = null;
  if (credencialUsina?.portal_portalId != null) {
    const [portalRows] = await db.query<PortalRow[]>(
      `SELECT * FROM portal WHERE portalId = ?`,
      [credencialUsina.portal_portalId],
    );
    portal = portalRows[0] || null;
  }

  let credencialStatus: StatusIntegracaoRow | null = null;
  if (credencialUsina?.status_statusIntegracaoInt != null) {
    const [statusRows] = await db.query<StatusIntegracaoRow[]>(
      `SELECT * FROM statusIntegracao WHERE statusIntegracaoID = ?`,
      [credencialUsina.status_statusIntegracaoInt],
    );
    credencialStatus = statusRows[0] || null;
  }

  return {
    unidade,
    faturaCredencial: credencialRows[0] || null,
    faturaRelatorioEnergetico: relatorioRows,
    rawFaturas,
    concessionaria,
    integrador,
    unidadeTerceira,
    credencialUsina,
    portal,
    credencialStatus,
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
