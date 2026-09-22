import { getUnidadeErrorStatus } from "../../utils/unit/rawFaturaHelpers.js";
import UnitStatusSummary from "./UnitStatusSummary.js";
import type { UnidadeDetails } from "../../types/unidades.js";

interface FaturasComErrosSummaryProps {
  foundIds: number[];
  resultsById: Record<number, UnidadeDetails>;
}

export default function FaturasComErrosSummary({ foundIds, resultsById }: FaturasComErrosSummaryProps) {
  return (
    <UnitStatusSummary
      title="Faturas com erros"
      foundIds={foundIds}
      resultsById={resultsById}
      getStatus={(details) => getUnidadeErrorStatus(details?.rawFaturas ?? [])}
      hideOk
    />
  );
}
