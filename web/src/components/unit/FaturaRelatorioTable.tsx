import { useState } from "react";
import {
  RELATORIO_VISIBLE_ROWS,
  SORTABLE_RELATORIO_COLUMNS,
  formatMonthLabel,
  getMissingMonths,
  orderRelatorioColumns,
  relatorioColumnLabel,
} from "../../utils/unit/relatorioHelpers.js";
import "../../css/units-details.css";
import "../../css/units-relatorio.css";
import "../../css/table.css";
import type { FaturaRelatorioRow } from "../../types/unidades.js";

interface FaturaRelatorioTableProps {
  relatorio: FaturaRelatorioRow[];
  onOpenPdf: (url: string) => void;
}

export default function FaturaRelatorioTable({ relatorio, onOpenPdf }: FaturaRelatorioTableProps) {
  const [relatorioSortColumn, setRelatorioSortColumn] = useState(
    "faturaMesReferencia",
  );
  const [showAllRelatorio, setShowAllRelatorio] = useState(false);

  const relatorioColumns = relatorio.length
    ? [
        ...orderRelatorioColumns(relatorio[0]),
        ...("faturaUrlArquivo" in relatorio[0] ? ["faturaUrlArquivoRaw"] : []),
      ]
    : [];
  const sortedRelatorio = [...relatorio].sort((a, b) => {
    const valueA = a[relatorioSortColumn] ?? "";
    const valueB = b[relatorioSortColumn] ?? "";
    return valueB > valueA ? 1 : valueB < valueA ? -1 : 0;
  });
  const visibleRelatorio = showAllRelatorio
    ? sortedRelatorio
    : sortedRelatorio.slice(0, RELATORIO_VISIBLE_ROWS);
  const hiddenRelatorioCount = sortedRelatorio.length - visibleRelatorio.length;
  const missingMonths = getMissingMonths(relatorio);

  return (
    <section className="units-details units-relatorio">
      <h2>
        Fatura Relatório Energético
        {missingMonths.length > 0 && (
          <span className="units-relatorio__missing">
            Meses ausentes (últimos 12):{" "}
            {missingMonths.map(formatMonthLabel).join(" - ")}
          </span>
        )}
      </h2>
      {relatorio.length === 0 ? (
        <p>Nenhum relatório encontrado para esta unidade.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {relatorioColumns.map((column) => {
                  const sortable = SORTABLE_RELATORIO_COLUMNS.includes(column);
                  const active = relatorioSortColumn === column;
                  return (
                    <th
                      key={column}
                      className={
                        sortable
                          ? `sortable${active ? " sortable--active" : ""}`
                          : undefined
                      }
                      onClick={
                        sortable ? () => setRelatorioSortColumn(column) : undefined
                      }
                    >
                      {relatorioColumnLabel(column)}
                      {active ? " ▼" : ""}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visibleRelatorio.map((row, index) => (
                <tr key={row.faturaId ?? index}>
                  {relatorioColumns.map((column) => {
                    if (column === "faturaUrlArquivoRaw") {
                      return (
                        <td key={column}>{String(row.faturaUrlArquivo ?? "")}</td>
                      );
                    }
                    const value = row[column];
                    if (column === "faturaUrlArquivo" && value) {
                      return (
                        <td key={column}>
                          <button
                            type="button"
                            className="units-relatorio__pdf-link"
                            title={String(value)}
                            onClick={() => onOpenPdf(String(value))}
                          >
                            Ver PDF
                          </button>
                        </td>
                      );
                    }
                    return <td key={column}>{String(value ?? "")}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {hiddenRelatorioCount > 0 && (
            <button
              type="button"
              className="units-relatorio__toggle"
              onClick={() => setShowAllRelatorio(true)}
            >
              Mostrar mais ({hiddenRelatorioCount})
            </button>
          )}
          {showAllRelatorio && sortedRelatorio.length > RELATORIO_VISIBLE_ROWS && (
            <button
              type="button"
              className="units-relatorio__toggle"
              onClick={() => setShowAllRelatorio(false)}
            >
              Mostrar menos
            </button>
          )}
        </div>
      )}
    </section>
  );
}
