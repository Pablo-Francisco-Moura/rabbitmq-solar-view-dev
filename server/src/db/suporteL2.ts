import { getPool } from "./pool.js";
import type { IntegradorIdRow, UsuarioRow } from "../types/unidades.js";
import type {
  AcessarIntegradorResult,
  ColaboradorAtualResult,
} from "../types/suporteL2.js";

// Conta de suporte fixa usada para "acessar" a conta de um integrador no
// portal my.solarview.com.br. Nunca deve vir do cliente.
const COLABORADOR_EMAIL_FIXO = "colaborador.pablo@solarview.com.br";

const NIVEL_ACESSO_INTEGRADOR = 1;
const NIVEL_ACESSO_INTEGRADOR_PREMIUM = 2;

async function getIntegradorPorIntegradorId(
  integradorId: number,
): Promise<ColaboradorAtualResult["integradorAtual"]> {
  const db = getPool();
  const [rows] = await db.query<UsuarioRow[]>(
    `SELECT u.* FROM usuario u
     INNER JOIN integrador i ON i.usuario_usuarioId = u.usuarioId
     WHERE i.integradorId = ?`,
    [integradorId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    usuarioId: row.usuarioId,
    usuNome: String(row.usuNome),
    usuEmail: String(row.usuEmail),
    integradorId,
  };
}

// Le o estado atual sem alterar nada: qual integrador colaborador.pablo esta
// espelhando agora (usuario.responsavel_integradorId). Usado pra mostrar esse
// integrador como placeholder antes de trocar pra outro.
export async function getColaboradorAtual(): Promise<ColaboradorAtualResult> {
  const db = getPool();

  const [colaboradorRows] = await db.query<UsuarioRow[]>(
    `SELECT * FROM usuario WHERE usuEmail = ?`,
    [COLABORADOR_EMAIL_FIXO],
  );
  const colaborador = colaboradorRows[0];
  if (!colaborador)
    throw new Error(
      `Colaborador de suporte ${COLABORADOR_EMAIL_FIXO} nao encontrado.`,
    );

  const integradorAtual =
    colaborador.responsavel_integradorId != null
      ? await getIntegradorPorIntegradorId(
          Number(colaborador.responsavel_integradorId),
        )
      : null;

  return {
    colaborador: {
      usuarioId: colaborador.usuarioId,
      usuEmail: String(colaborador.usuEmail),
    },
    integradorAtual,
  };
}

// Aceita tanto usuario.usuarioId (numerico) quanto usuEmail — na pratica o
// usuario de suporte quase sempre tem o e-mail em maos, raramente o id.
// Mesma trava do SuporteL2::acessarContaIntegrador legado (solarview-web,
// Usuario_model::getIdByEmail): exclui bloqueados/excluidos aqui, antes de
// qualquer checagem de nivel de acesso, senao a troca podia mirar num
// usuario que nem deveria mais logar.
async function findUsuarioPorIdentificador(
  identificador: string,
): Promise<UsuarioRow | undefined> {
  const db = getPool();
  const isUsuarioId = /^\d+$/.test(identificador);
  const [rows] = await db.query<UsuarioRow[]>(
    isUsuarioId
      ? `SELECT * FROM usuario WHERE usuarioId = ? AND usuBloqueado = 0 AND deleted_at IS NULL`
      : `SELECT * FROM usuario WHERE usuEmail = ? AND usuBloqueado = 0 AND deleted_at IS NULL`,
    [isUsuarioId ? Number(identificador) : identificador],
  );
  return rows[0];
}

// Espelha SuporteL2::acessarContaIntegrador do portal legado (CodeIgniter,
// solarview-web). Aquele endpoint nao faz impersonation/login-as: ele apenas
// reatribui a conta fixa de suporte (COLABORADOR_EMAIL_FIXO) para pertencer
// ao integrador informado, via UPDATE usuario.responsavel_integradorId. O
// "acesso" so acontece quando esse colaborador loga normalmente no portal
// depois disso — nao ha sessao, token ou impersonation de fato.
export async function acessarContaIntegrador(
  integradorIdentificador: string,
): Promise<AcessarIntegradorResult> {
  const db = getPool();

  const integradorUsuario = await findUsuarioPorIdentificador(
    integradorIdentificador,
  );
  if (!integradorUsuario)
    throw new Error(
      `Usuario "${integradorIdentificador}" nao encontrado (verifique se nao esta bloqueado ou excluido).`,
    );

  const nivelAcesso = Number(integradorUsuario.usuNivAcesso);
  if (
    nivelAcesso !== NIVEL_ACESSO_INTEGRADOR &&
    nivelAcesso !== NIVEL_ACESSO_INTEGRADOR_PREMIUM
  )
    throw new Error(
      `Usuario "${integradorIdentificador}" nao e' um Integrador (usuNivAcesso=${integradorUsuario.usuNivAcesso}).`,
    );

  const [integradorCadastroRows] = await db.query<IntegradorIdRow[]>(
    `SELECT integradorId FROM integrador WHERE usuario_usuarioId = ?`,
    [integradorUsuario.usuarioId],
  );
  const integradorCadastro = integradorCadastroRows[0];
  if (!integradorCadastro)
    throw new Error(
      `Cadastro de integrador nao encontrado para o usuario ${integradorUsuario.usuarioId}.`,
    );

  const [colaboradorRows] = await db.query<UsuarioRow[]>(
    `SELECT * FROM usuario WHERE usuEmail = ?`,
    [COLABORADOR_EMAIL_FIXO],
  );
  const colaborador = colaboradorRows[0];
  if (!colaborador)
    throw new Error(
      `Colaborador de suporte ${COLABORADOR_EMAIL_FIXO} nao encontrado.`,
    );

  const integradorAnterior =
    colaborador.responsavel_integradorId != null
      ? await getIntegradorPorIntegradorId(
          Number(colaborador.responsavel_integradorId),
        )
      : null;

  if (
    Number(colaborador.responsavel_integradorId) ===
    integradorCadastro.integradorId
  )
    throw new Error(
      `Este colaborador ja pertence ao integrador "${integradorIdentificador}".`,
    );

  await db.query(
    `UPDATE usuario SET responsavel_integradorId = ? WHERE usuarioId = ?`,
    [integradorCadastro.integradorId, colaborador.usuarioId],
  );

  return {
    colaborador: {
      usuarioId: colaborador.usuarioId,
      usuEmail: String(colaborador.usuEmail),
    },
    integrador: {
      usuarioId: integradorUsuario.usuarioId,
      usuNome: String(integradorUsuario.usuNome),
      usuEmail: String(integradorUsuario.usuEmail),
      integradorId: integradorCadastro.integradorId,
    },
    integradorAnterior,
  };
}
