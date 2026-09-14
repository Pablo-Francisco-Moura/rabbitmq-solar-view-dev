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
