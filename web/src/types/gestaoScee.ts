export interface GestaoSceeVinculo {
  id: number;
  unidadeGeradoraId: number;
  unidadeBeneficiariaId: number;
  porcentagemDistribuicao: number;
  ordemPrioridade: number | null;
  recebeExcedente: boolean | number;
  created_at: string;
  updated_at: string;
  [column: string]: unknown;
}
