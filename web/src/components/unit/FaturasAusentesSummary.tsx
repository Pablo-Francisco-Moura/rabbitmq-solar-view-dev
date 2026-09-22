import { getUnidadeStatus } from "../../utils/unit/relatorioHelpers.js";
import UnitStatusSummary from "./UnitStatusSummary.js";
import type { UnidadeDetails } from "../../types/unidades.js";

interface FaturasAusentesSummaryProps {
  foundIds: number[];
  resultsById: Record<number, UnidadeDetails>;
}

export default function FaturasAusentesSummary({ foundIds, resultsById }: FaturasAusentesSummaryProps) {
  return (
    <UnitStatusSummary
      title="Faturas ausentes"
      foundIds={foundIds}
      resultsById={resultsById}
      getStatus={(details) => getUnidadeStatus(details?.faturaRelatorioEnergetico ?? [])}
    />
  );
}
