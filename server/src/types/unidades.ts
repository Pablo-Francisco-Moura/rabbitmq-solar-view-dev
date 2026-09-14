import type { RowDataPacket } from "mysql2/promise";
import type { PortalRow } from "./portais.js";

// Colunas explicitamente selecionadas (SELECT col1, col2, ...): a linha tem
// exatamente esses campos, nada mais.

export interface UnidadeJobPayloadRow extends RowDataPacket {
  unidadeId: number;
  uniIntegradorResponsavel: number | null;
  proprietario_usuarioId: number | null;
  concessionaria_concessionariaId: number | null;
  uniConcessionaria: string | null;
  grupo_tarifario: string | null;
}

export interface IntegradorIdRow extends RowDataPacket {
  integradorId: number;
}

export interface UnidadeNomeRow extends RowDataPacket {
  unidadeId: number;
  uniNome: string;
}

// Tabelas lidas via SELECT *: so conhecemos os campos que o codigo de fato
// usa, entao a assinatura de indice deixa explicito que a linha real do banco
// tem mais colunas do que as tipadas aqui.

export interface UnidadeRow extends RowDataPacket {
  unidadeId: number;
  uniNome: string;
  uniIntegradorResponsavel: number | null;
  concessionaria_concessionariaId: number | null;
  faturaCodigoInstalacao: string | null;
  faturaNewCodigoInstalacao: string | null;
  [column: string]: unknown;
}

export interface FaturaCredencialRow extends RowDataPacket {
  faturaCredencialId: number;
  unidade_unidadeId: number;
  user: string | null;
  password: string | null;
  birthdate: string | null;
  cpf: string | null;
  statusCredencial: string | null;
  faturaCodigoInstalacao: string | null;
  faturaNewCodigoInstalacao: string | null;
  faturaCodigoCliente: string | null;
  faturaCodigoContrato: string | null;
  tipoPessoa: number | null;
  email: string | null;
  [column: string]: unknown;
}

export interface FaturaRelatorioEnergeticoRow extends RowDataPacket {
  faturaId: number;
  unidade_unidadeId: number;
  faturaMesReferencia: string;
  [column: string]: unknown;
}

export interface ConcessionariaRow extends RowDataPacket {
  concessionariaId: number;
  [column: string]: unknown;
}

export interface UsuarioRow extends RowDataPacket {
  usuarioId: number;
  [column: string]: unknown;
}

export interface UnidadeTerceiraRow extends RowDataPacket {
  unidadesTerceirasId: number;
  unidadesTerceiras_unidadeId: number | null;
  unidadesTerceiras_credencialId: number | null;
  [column: string]: unknown;
}

export interface CredencialRow extends RowDataPacket {
  credencialId: number;
  portal_portalId: number | null;
  status_statusIntegracaoInt: number | null;
  [column: string]: unknown;
}

export interface StatusIntegracaoRow extends RowDataPacket {
  statusIntegracaoID: number;
  statusIntegracaoNome: string | null;
  statusIntegracaoDescricao: string | null;
}

// Formas retornadas pelas funcoes de db/unidades.ts (nao mapeiam 1:1 pra uma linha).

export interface UnidadeJobPayload {
  companyId: number | null;
  credential: {
    id: number;
    username: string | null;
    password: string | null;
    birthdate: string | null;
    cpf: string | null;
    statusCredencial: string | null;
    installationCode: string | null;
    newInstallationNumber: string | null;
    clientCode: string | null;
    contractCode: string | null;
    isCompany: number | null;
    userId: number | null;
    unityId: number;
    integratorId: number;
    concessionaireName: string | null;
    tariffGroup: string | null;
    email: string | null;
  };
  dev: boolean;
  base64: boolean;
  isPortalAuth: boolean;
  priority: number;
}

export interface UnidadeDetails {
  unidade: UnidadeRow;
  faturaCredencial: FaturaCredencialRow | null;
  faturaRelatorioEnergetico: FaturaRelatorioEnergeticoRow[];
  concessionaria: ConcessionariaRow | null;
  integrador: UsuarioRow | null;
  unidadeTerceira: UnidadeTerceiraRow | null;
  credencialUsina: CredencialRow | null;
  portal: PortalRow | null;
  credencialStatus: StatusIntegracaoRow | null;
}

export interface InstallationCodesUpdate {
  faturaCodigoInstalacao: string | null;
  faturaNewCodigoInstalacao: string | null;
}

// Corpo bruto do PATCH /api/unidades/:unidadeId/codigos-instalacao, antes da
// validacao de tipo feita na rota.
export interface InstallationCodesRequestBody {
  faturaCodigoInstalacao?: unknown;
  faturaNewCodigoInstalacao?: unknown;
}
