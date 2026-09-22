import { useState } from "react";
import {
  NBSP,
  buildSummaryHtml,
  buildSummaryPlainText,
  padEndNbsp,
  padStartNbsp,
} from "../../utils/unit/summaryClipboard.js";
import "../../css/units-details.css";
import "../../css/units-summary.css";
import type { UnidadeDetails, UnidadeStatus } from "../../types/unidades.js";

interface UnitStatusSummaryProps {
  title: string;
  foundIds: number[];
  resultsById: Record<number, UnidadeDetails>;
  getStatus: (details: UnidadeDetails | undefined) => UnidadeStatus;
  // Omite da lista (e do "Copiar") as unidades cujo status deu "ok" — pra
  // secoes tipo "Faturas com erros", que so fazem sentido como lista de
  // pendencia: unidade sem problema nao deveria nem aparecer.
  hideOk?: boolean;
}

// Base generica por trás de "Faturas ausentes" e "Faturas com erros" — mesmo
// layout compacto (un/nome/aneel/status) e mesma cópia formatada (texto +
// html colorido), só muda o título e como o status de cada unidade é
// calculado.
export default function UnitStatusSummary({
  title,
  foundIds,
  resultsById,
  getStatus,
  hideOk = false,
}: UnitStatusSummaryProps) {
  const [copied, setCopied] = useState(false);

  const allRows = foundIds.map((id) => ({
    id,
    nome: resultsById[id]?.unidade?.uniNome ?? "",
    aneel:
      resultsById[id]?.concessionaria?.sig_agente ||
      resultsById[id]?.concessionaria?.nomeGrupo ||
      "",
    status: getStatus(resultsById[id]),
  }));
  const rows = hideOk ? allRows.filter((row) => row.status.tone !== "ok") : allRows;

  if (rows.length === 0) return null;

  const idWidth = Math.max(0, ...rows.map((row) => String(row.id).length));
  const nomeWidth = Math.max(0, ...rows.map((row) => row.nome.length));
  const aneelWidth = Math.max(0, ...rows.map((row) => row.aneel.length));

  async function handleCopy() {
    const text = buildSummaryPlainText(rows, idWidth, nomeWidth, aneelWidth);
    const html = buildSummaryHtml(rows, idWidth, nomeWidth, aneelWidth);
    try {
      if (navigator.clipboard?.write && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([text], { type: "text/plain" }),
            "text/html": new Blob([html], { type: "text/html" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponivel (permissao negada, contexto nao seguro etc.)
    }
  }

  return (
    <section className="units-details units-summary">
      <div className="units-summary__header">
        <h2>{title}</h2>
        <button type="button" onClick={handleCopy}>
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <div className="units-summary__list">
        {rows.map((row) => (
          <div className="units-summary__row" key={row.id}>
            <span className="units-summary__label">un:{NBSP}</span>
            <span className="units-summary__value">
              {padStartNbsp(String(row.id), idWidth)}
            </span>
            <span className="units-summary__label">{NBSP}nome:{NBSP}</span>
            <span className="units-summary__value">
              {padEndNbsp(row.nome, nomeWidth)}
            </span>
            <span className="units-summary__label">{NBSP}aneel:{NBSP}</span>
            <span className="units-summary__value">
              {padEndNbsp(row.aneel, aneelWidth)}
            </span>
            <span className="units-summary__label">{NBSP}-{NBSP}</span>
            <span
              className={`units-summary__value units-summary__value--${row.status.tone}`}
            >
              {row.status.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
