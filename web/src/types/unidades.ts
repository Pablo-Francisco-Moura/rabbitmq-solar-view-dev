// Linhas vindas do servidor via SELECT *: so conhecemos os campos que o
// frontend de fato le, entao a assinatura de indice deixa explicito que a
// linha real tem mais colunas do que as tipadas aqui.

export interface UnidadeRow {
  unidadeId: number;
  uniNome?: string;
  uniIntegradorResponsavel?: number | null;
  concessionaria_concessionariaId?: number | null;
  faturaCodigoInstalacao?: string | null;
  faturaNewCodigoInstalacao?: string | null;
  [column: string]: unknown;
}

export interface ConcessionariaRow {
  concessionariaId?: number;
  sig_agente?: string;
  nomeGrupo?: string;
  [column: string]: unknown;
}

export interface FaturaRelatorioRow {
  faturaId?: number;
  faturaMesReferencia?: string;
  faturaDataReferencia?: string;
  faturaDataLeituraAtual?: string;
  faturaUrlArquivo?: string;
  [column: string]: unknown;
}

export interface UnidadeDetails {
  unidade: UnidadeRow;
  faturaCredencial: Record<string, unknown> | null;
  faturaRelatorioEnergetico: FaturaRelatorioRow[];
  concessionaria: ConcessionariaRow | null;
  integrador: Record<string, unknown> | null;
  unidadeTerceira: Record<string, unknown> | null;
  credencialUsina: Record<string, unknown> | null;
  portal: Record<string, unknown> | null;
  credencialStatus: Record<string, unknown> | null;
}

export interface UnidadeNome {
  unidadeId: number;
  uniNome: string;
}

export interface UnidadeStatus {
  label: string;
  tone: "ok" | "neutral" | "warning" | "error";
}

export interface SummaryRow {
  id: number;
  nome: string;
  aneel: string;
  status: UnidadeStatus;
}

export interface InstallationCodesUpdate {
  faturaCodigoInstalacao: string;
  faturaNewCodigoInstalacao: string;
}

// Payload de job pronto pra publicar na fila: o frontend so serializa esse
// objeto (ou uma lista dele) de volta pro textarea, nunca le campos
// especificos, entao um blob JSON generico basta aqui.
export type UnidadeJobPayload = Record<string, unknown>;
