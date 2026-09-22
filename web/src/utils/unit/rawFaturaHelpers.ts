import type { RawFaturaRow, UnidadeStatus } from "../../types/unidades.js";
import { formatMonthLabel } from "./relatorioHelpers.js";

// Status que significam "essa fatura ja esta resolvida" — 'done' (Concluido,
// acabou de virar uma fatura de verdade) e 'skipped' (Deduplicado, ja era
// conhecida). Qualquer outro (pending/extracting/processing/error) ainda
// precisa de atencao.
const RESOLVED_STATUSES: RawFaturaRow["status"][] = ["done", "skipped"];

// Meses (YYYY-MM) com pelo menos uma raw_fatura cujo status nao esteja em
// RESOLVED_STATUSES.
export function getErrorMonths(rawFaturas: RawFaturaRow[]): string[] {
  const months = new Set<string>();
  for (const row of rawFaturas) {
    if (RESOLVED_STATUSES.includes(row.status)) continue;
    if (row.data_referencia) months.add(row.data_referencia.slice(0, 7));
  }
  return [...months].sort();
}

export function getUnidadeErrorStatus(rawFaturas: RawFaturaRow[]): UnidadeStatus {
  const months = getErrorMonths(rawFaturas);
  if (months.length === 0) return { label: "OK", tone: "ok" };
  return { label: months.map(formatMonthLabel).join(" - "), tone: "error" };
}
