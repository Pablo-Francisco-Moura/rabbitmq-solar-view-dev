import { getPool } from "./pool.js";
import type { IntegradorIdRow, UsuarioRow } from "../types/unidades.js";
import type { AcessarIntegradorResult } from "../types/suporteL2.js";

// Conta de suporte fixa usada para "acessar" a conta de um integrador no
// portal my.solarview.com.br. Nunca deve vir do cliente.
const COLABORADOR_EMAIL_FIXO = "colaborador.pablo@solarview.com.br";

const NIVEL_ACESSO_INTEGRADOR = 1;
const NIVEL_ACESSO_INTEGRADOR_PREMIUM = 2;

// Espelha SuporteL2::acessarContaIntegrador do portal legado (CodeIgniter,
// solarview-web). Aquele endpoint nao faz impersonation/login-as: ele apenas
// reatribui a conta fixa de suporte (COLABORADOR_EMAIL_FIXO) para pertencer
// ao integrador informado, via UPDATE usuario.responsavel_integradorId. O
// "acesso" so acontece quando esse colaborador loga normalmente no portal
// depois disso — nao ha sessao, token ou impersonation de fato.
export async function acessarContaIntegrador(
  integradorUsuarioId: number,
): Promise<AcessarIntegradorResult> {
  const db = getPool();

  const [integradorUsuarioRows] = await db.query<UsuarioRow[]>(
    `SELECT * FROM usuario WHERE usuarioId = ?`,
    [integradorUsuarioId],
  );
  const integradorUsuario = integradorUsuarioRows[0];
  if (!integradorUsuario)
    throw new Error(`Usuario ${integradorUsuarioId} nao encontrado.`);

  const nivelAcesso = Number(integradorUsuario.usuNivAcesso);
  if (
    nivelAcesso !== NIVEL_ACESSO_INTEGRADOR &&
    nivelAcesso !== NIVEL_ACESSO_INTEGRADOR_PREMIUM
  )
    throw new Error(
      `Usuario ${integradorUsuarioId} nao e' um Integrador (usuNivAcesso=${integradorUsuario.usuNivAcesso}).`,
    );

  const [integradorCadastroRows] = await db.query<IntegradorIdRow[]>(
    `SELECT integradorId FROM integrador WHERE usuario_usuarioId = ?`,
    [integradorUsuarioId],
  );
  const integradorCadastro = integradorCadastroRows[0];
  if (!integradorCadastro)
    throw new Error(
      `Cadastro de integrador nao encontrado para o usuario ${integradorUsuarioId}.`,
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

  let integradorAnterior: AcessarIntegradorResult["integradorAnterior"] = null;
  if (colaborador.responsavel_integradorId != null) {
    const [anteriorRows] = await db.query<UsuarioRow[]>(
      `SELECT u.* FROM usuario u
       INNER JOIN integrador i ON i.usuario_usuarioId = u.usuarioId
       WHERE i.integradorId = ?`,
      [colaborador.responsavel_integradorId],
    );
    const anterior = anteriorRows[0];
    if (anterior)
      integradorAnterior = {
        usuarioId: anterior.usuarioId,
        usuNome: String(anterior.usuNome),
        usuEmail: String(anterior.usuEmail),
      };
  }

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
