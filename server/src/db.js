import mysql from "mysql2/promise";

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.IDC_MYSQL_HOST_PROD || process.env.IDC_MYSQL_HOST,
      port: Number(
        process.env.IDC_MYSQL_PORT_PROD || process.env.IDC_MYSQL_PORT || 3306,
      ),
      user: process.env.IDC_MYSQL_USER_PROD || process.env.IDC_MYSQL_USER,
      password: process.env.IDC_MYSQL_PASS_PROD || process.env.IDC_MYSQL_PASS,
      database: process.env.IDC_MYSQL_DB_PROD || process.env.IDC_MYSQL_DB,
      waitForConnections: true,
      connectionLimit: 5,
      dateStrings: true,
    });
  }
  return pool;
}

// Espelha o job publicado hoje manualmente nas filas idc_*: dado o unidadeId,
// busca fatura credencial + unidade e resolve o integradorId via
// integrador.usuario_usuarioId = unidade.uniIntegradorResponsavel (esse ultimo
// e' um usuarioId, nao um integradorId).
export async function getUnidadeJobPayload(unidadeId) {
  const db = getPool();

  const [unidadeRows] = await db.query(
    `SELECT unidadeId, uniIntegradorResponsavel, proprietario_usuarioId,
            concessionaria_concessionariaId, uniConcessionaria, grupo_tarifario
     FROM unidade
     WHERE unidadeId = ?`,
    [unidadeId],
  );
  const unidade = unidadeRows[0];
  if (!unidade) throw new Error(`Unidade ${unidadeId} nao encontrada.`);

  const [credencialRows] = await db.query(
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

  const [integradorRows] = await db.query(
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

export async function getUnidadeDetails(unidadeId) {
  const db = getPool();

  const [unidadeRows] = await db.query(
    `SELECT * FROM unidade WHERE unidadeId = ?`,
    [unidadeId],
  );
  const unidade = unidadeRows[0];
  if (!unidade) throw new Error(`Unidade ${unidadeId} nao encontrada.`);

  const [credencialRows] = await db.query(
    `SELECT * FROM faturaCredencial
     WHERE unidade_unidadeId = ?
     ORDER BY faturaCredencialId DESC
     LIMIT 1`,
    [unidadeId],
  );

  const [relatorioRows] = await db.query(
    `SELECT * FROM faturaRelatorioEnergetico fre
     WHERE fre.unidade_unidadeId = ?
     ORDER BY fre.faturaMesReferencia DESC`,
    [unidadeId],
  );

  let concessionaria = null;
  if (unidade.concessionaria_concessionariaId != null) {
    const [concessionariaRows] = await db.query(
      `SELECT * FROM concessionaria WHERE concessionariaId = ?`,
      [unidade.concessionaria_concessionariaId],
    );
    concessionaria = concessionariaRows[0] || null;
  }

  // unidade.uniIntegradorResponsavel guarda um usuarioId (nao um integradorId
  // - ver getUnidadeJobPayload acima), entao o integrador e' o usuario dono
  // desse id.
  let integrador = null;
  if (unidade.uniIntegradorResponsavel != null) {
    const [integradorRows] = await db.query(
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
  unidadeId,
  { faturaCodigoInstalacao, faturaNewCodigoInstalacao },
) {
  const db = getPool();

  const [unidadeResult] = await db.query(
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

// Usado so para exibicao (titulo da mensagem na UI) — nunca entra no payload do job.
export async function getUnidadeNomes(unidadeIds) {
  if (!unidadeIds.length) return {};
  const db = getPool();
  const [rows] = await db.query(
    `SELECT unidadeId, uniNome FROM unidade WHERE unidadeId IN (?)`,
    [unidadeIds],
  );
  const nomes = {};
  for (const row of rows) nomes[row.unidadeId] = row.uniNome;
  return nomes;
}

// Busca por nome (LIKE parcial), acionada na UI quando o usuario digita o nome
// entre aspas duplas em vez de um unidadeId.
export async function searchUnidadesByNome(nome) {
  const db = getPool();
  const [rows] = await db.query(
    `SELECT unidadeId, uniNome FROM unidade WHERE uniNome LIKE ? ORDER BY uniNome LIMIT 200`,
    [`%${nome}%`],
  );
  return rows;
}
