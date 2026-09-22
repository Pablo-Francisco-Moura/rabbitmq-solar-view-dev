export interface AcessarIntegradorResult {
  colaborador: {
    usuarioId: number;
    usuEmail: string;
  };
  integrador: {
    usuarioId: number;
    usuNome: string;
    usuEmail: string;
    integradorId: number;
  };
  integradorAnterior: {
    usuarioId: number;
    usuNome: string;
    usuEmail: string;
  } | null;
}

export interface ColaboradorAtualResult {
  colaborador: {
    usuarioId: number;
    usuEmail: string;
  };
  integradorAtual: {
    usuarioId: number;
    usuNome: string;
    usuEmail: string;
    integradorId: number;
  } | null;
}
