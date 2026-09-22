import { useState } from "react";
import { formatMonthLabel } from "../../utils/unit/relatorioHelpers.js";
import CopyableText from "../CopyableText.js";
import TruncatedDetail from "../TruncatedDetail.js";
import "../../css/units-details.css";
import "../../css/units-raw-faturas.css";
import "../../css/table.css";
import type { RawFaturaRow } from "../../types/unidades.js";

interface RawFaturasTableProps {
  rawFaturas: RawFaturaRow[];
  onOpenPdf: (url: string) => void;
  onUnlock: (rawFaturaId: number) => Promise<void>;
}

const STATUS_LABEL: Record<RawFaturaRow["status"], string> = {
  pending: "Pendente",
  extracting: "Extraindo",
  processing: "Processando",
  done: "Concluído",
  error: "Erro",
  skipped: "Deduplicado",
};

const STATUS_TONE: Record<RawFaturaRow["status"], "ok" | "warning" | "error"> = {
  pending: "warning",
  extracting: "warning",
  processing: "warning",
  done: "ok",
  error: "error",
  skipped: "ok",
};

function formatMesReferencia(dataReferencia: string | null): string {
  if (!dataReferencia) return "—";
  return formatMonthLabel(dataReferencia.slice(0, 7));
}

export default function RawFaturasTable({
  rawFaturas,
  onOpenPdf,
  onUnlock,
}: RawFaturasTableProps) {
  // Defesa extra: cache antigo em localStorage ou uma resposta inesperada da
  // API podem chegar sem esse campo — sem isso o .length/.map abaixo quebra a
  // pagina inteira (sem error boundary no app).
  const rows = rawFaturas ?? [];
  const [unlockingId, setUnlockingId] = useState<number | null>(null);

  async function handleUnlock(row: RawFaturaRow) {
    if (
      !window.confirm(
        `Destravar a raw_fatura ${row.id} (${formatMesReferencia(row.data_referencia)})?\n\n` +
          `Isso volta o status pra 'pending' e zera as tentativas, pra o job de extração do solarview_api_3.0 tentar de novo no próximo ciclo (a cada 5s). Só faz sentido depois do fix da extração já estar em produção.`,
      )
    )
      return;
    setUnlockingId(row.id);
    try {
      await onUnlock(row.id);
    } finally {
      setUnlockingId(null);
    }
  }

  return (
    <section className="units-details units-raw-faturas">
      <div className="units-raw-faturas__header">
        <h2>Faturas no S3 (raw_faturas)</h2>
      </div>
      <p className="units-raw-faturas__hint">
        Fatura presente aqui mas ausente na tabela acima (Fatura Relatório Energético) = baixada
        pro S3, mas nunca virou fatura de verdade — confira o status.
      </p>
      {rows.length === 0 ? (
        <p>Nenhuma raw_fatura encontrada para esta unidade.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Mês Ref.</th>
                <th>PDF</th>
                <th>URL</th>
                <th>Status</th>
                <th>Etapa</th>
                <th>Tentativas</th>
                <th>No relatório?</th>
                <th>Erro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatMesReferencia(row.data_referencia)}</td>
                  <td>
                    <button
                      type="button"
                      className="units-relatorio__pdf-link"
                      title={row.url}
                      onClick={() => onOpenPdf(row.url)}
                    >
                      Ver PDF
                    </button>
                  </td>
                  <td>
                    <CopyableText value={row.url} />
                  </td>
                  <td>
                    <span
                      className={`units-raw-faturas__status units-raw-faturas__status--${STATUS_TONE[row.status]}`}
                    >
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </td>
                  <td>{row.etapa ?? "—"}</td>
                  <td>{row.tentativas}</td>
                  <td>
                    {row.fatura_id != null ? (
                      <span className="units-raw-faturas__status units-raw-faturas__status--ok">
                        ✓ fatura {row.fatura_id}
                      </span>
                    ) : (
                      <span className="units-raw-faturas__status units-raw-faturas__status--error">
                        ausente
                      </span>
                    )}
                  </td>
                  <td className="units-raw-faturas__erro">
                    {row.erro_processamento ? (
                      <TruncatedDetail
                        value={row.erro_processamento}
                        title={`Erro — raw_fatura ${row.id}`}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {row.status === "error" && (
                      <button
                        type="button"
                        className="units-raw-faturas__unlock"
                        disabled={unlockingId === row.id}
                        onClick={() => handleUnlock(row)}
                      >
                        {unlockingId === row.id ? "…" : "🔓 Destravar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
