import type { RowDataPacket } from "mysql2/promise";

export interface PortalRow extends RowDataPacket {
  portalId: number;
  portalNome: string;
  portalNomeCurto: string;
  portalSobreNome: string;
  portalIcone: string;
  portalDescricao: string;
  portalAPIKeyGeral: string;
  portalStatus: number;
  portalAtivo: number;
  portalUrl: string;
  portalIconeUrl: string;
  emManutencao: number | null;
  portalAuthConfig: unknown;
}

export interface TipoRequisicaoRoboRow extends RowDataPacket {
  tipoRequisicaoRoboId: number;
  tipoRequisicaoRoboNome: string;
  tipoRequisicaoRoboDescricao: string;
}

export interface LogRequisicaoRoboRow extends RowDataPacket {
  logRequisicoesRobosId: number;
  requisicaoId: string;
  portal: number;
  credencial: number;
  usuario: number | null;
  unidade: number;
  sucesso: number;
  requisicao: number;
  evento: number;
  origem: number;
  eventoMensagem: string;
  horarioRequisicao: string;
  horarioRegistro: string;
  respostaLog: string;
}
