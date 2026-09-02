import type { RowDataPacket } from "mysql2/promise";

export interface GestaoSceeRow extends RowDataPacket {
  unidadeGeradoraId: number;
  unidadeBeneficiariaId: number;
  [column: string]: unknown;
}
