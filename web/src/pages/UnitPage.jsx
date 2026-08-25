import { useEffect, useState } from "react";
import { getUnidadeDetails, updateUnidadeInstallationCodes } from "../api.js";

const STORAGE_KEY = "rabbitmq-solar-view-dev:unit-page";
const RELATORIO_PRIORITY_COLUMNS = [
  "faturaId",
  "faturaMesReferencia",
  "faturaDataReferencia",
  "faturaCodigoInstalacao",
  "faturaNewCodigoInstalacao",
];
const SORTABLE_RELATORIO_COLUMNS = ["faturaMesReferencia", "faturaDataReferencia"];
const UNIDADE_FIELD_ORDER = [
  "unidadeId",
  "uniNome",
  "uniAtiva",
  "concessionaria_concessionariaId",
  "uniIntegradorResponsavel",
  "faturaCodigoInstalacao",
  "faturaNewCodigoInstalacao",
];

function orderUnidadeFields(unidade) {
  const keys = Object.keys(unidade);
  const priority = UNIDADE_FIELD_ORDER.filter((key) => keys.includes(key));
  const rest = keys.filter((key) => !UNIDADE_FIELD_ORDER.includes(key));
  const ordered = {};
  for (const key of [...priority, ...rest]) ordered[key] = unidade[key];
  return ordered;
}

function loadStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function orderRelatorioColumns(sampleRow) {
  const keys = Object.keys(sampleRow);
  const priority = RELATORIO_PRIORITY_COLUMNS.filter((key) => keys.includes(key));
  const rest = keys.filter((key) => !RELATORIO_PRIORITY_COLUMNS.includes(key));
  return [...priority, ...rest];
}

function getLastNMonths(n) {
  const months = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function formatMonthLabel(yearMonth) {
  const [year, month] = yearMonth.split("-");
  return `${month}/${year.slice(2)}`;
}

function getMissingMonths(relatorio) {
  const present = new Set();
  for (const row of relatorio) {
    if (row.faturaMesReferencia) present.add(String(row.faturaMesReferencia).slice(0, 7));
    if (row.faturaDataReferencia) present.add(String(row.faturaDataReferencia).slice(0, 7));
  }
  return getLastNMonths(12)
    .filter((month) => !present.has(month))
    .reverse();
}

export default function UnitPage() {
  const [unidadeId, setUnidadeId] = useState(
    () => loadStoredState()?.unidadeId ?? "",
  );
  const [details, setDetails] = useState(
    () => loadStoredState()?.details ?? null,
  );
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [faturaCodigoInstalacao, setFaturaCodigoInstalacao] = useState(
    () => loadStoredState()?.faturaCodigoInstalacao ?? "",
  );
  const [faturaNewCodigoInstalacao, setFaturaNewCodigoInstalacao] = useState(
    () => loadStoredState()?.faturaNewCodigoInstalacao ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [relatorioSortColumn, setRelatorioSortColumn] = useState(
    "faturaMesReferencia",
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          unidadeId,
          details,
          faturaCodigoInstalacao,
          faturaNewCodigoInstalacao,
        }),
      );
    } catch {
      // localStorage indisponivel (modo privado, storage cheio etc.) — segue sem persistir.
    }
  }, [unidadeId, details, faturaCodigoInstalacao, faturaNewCodigoInstalacao]);

  async function handleSearch(event) {
    event.preventDefault();
    if (!unidadeId) return;
    setLoading(true);
    setError(null);
    setSaveStatus(null);
    try {
      const data = await getUnidadeDetails(unidadeId);
      setDetails(data);
      setFaturaCodigoInstalacao(data.unidade.faturaCodigoInstalacao ?? "");
      setFaturaNewCodigoInstalacao(
        data.unidade.faturaNewCodigoInstalacao ?? "",
      );
      setRelatorioSortColumn("faturaMesReferencia");
    } catch (err) {
      setDetails(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!details) return;
    if (
      !window.confirm(
        `Atualizar codigo de instalacao e novo codigo de instalacao da unidade ${details.unidade.unidadeId} nas tabelas unidade e faturaCredencial? Essa ação não pode ser desfeita.`,
      )
    )
      return;

    setSaving(true);
    setSaveStatus(null);
    try {
      const data = await updateUnidadeInstallationCodes(
        details.unidade.unidadeId,
        { faturaCodigoInstalacao, faturaNewCodigoInstalacao },
      );
      setDetails(data);
      setSaveStatus({ ok: true, message: "Códigos atualizados." });
    } catch (err) {
      setSaveStatus({ ok: false, message: err.message });
    } finally {
      setSaving(false);
    }
  }

  const relatorio = details?.faturaRelatorioEnergetico ?? [];
  const relatorioColumns = relatorio.length
    ? orderRelatorioColumns(relatorio[0])
    : [];
  const sortedRelatorio = [...relatorio].sort((a, b) => {
    const valueA = a[relatorioSortColumn] ?? "";
    const valueB = b[relatorioSortColumn] ?? "";
    return valueB > valueA ? 1 : valueB < valueA ? -1 : 0;
  });
  const missingMonths = getMissingMonths(relatorio);

  return (
    <div>
      <header className="app__header">
        <h1>Unit</h1>
      </header>

      <form className="units-search" onSubmit={handleSearch}>
        <label>
          Unidade ID
          <input
            type="number"
            min={1}
            placeholder="Ex: 712383"
            value={unidadeId}
            onChange={(event) => setUnidadeId(event.target.value)}
          />
        </label>
        <button type="submit" disabled={!unidadeId || loading}>
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {error && <p className="app__error">{error}</p>}

      {details && (
        <>
          <div className="app__grid">
            <section className="units-details">
              <h2>Unidade</h2>
              <pre>
                {JSON.stringify(orderUnidadeFields(details.unidade), null, 2)}
              </pre>

              <h2>Fatura Credencial</h2>
              {details.faturaCredencial ? (
                <pre>{JSON.stringify(details.faturaCredencial, null, 2)}</pre>
              ) : (
                <p>Nenhuma faturaCredencial encontrada para esta unidade.</p>
              )}
            </section>

            <form className="publish-form" onSubmit={handleSave}>
              <h2>Atualizar códigos de instalação</h2>
              <p>
                Atualiza <code>faturaCodigoInstalacao</code> e{" "}
                <code>faturaNewCodigoInstalacao</code> nas tabelas{" "}
                <code>unidade</code> e <code>faturaCredencial</code> desta
                unidade. Nenhum outro campo é alterado.
              </p>

              <label>
                Código de instalação
                <input
                  type="text"
                  value={faturaCodigoInstalacao}
                  onChange={(event) =>
                    setFaturaCodigoInstalacao(event.target.value)
                  }
                />
              </label>

              <label>
                Novo código de instalação
                <input
                  type="text"
                  value={faturaNewCodigoInstalacao}
                  onChange={(event) =>
                    setFaturaNewCodigoInstalacao(event.target.value)
                  }
                />
              </label>

              <div className="publish-form__actions">
                <button type="submit" disabled={saving}>
                  {saving ? "Salvando…" : "Salvar"}
                </button>
                {saveStatus && (
                  <span
                    className={
                      saveStatus.ok
                        ? "status status--ok"
                        : "status status--error"
                    }
                  >
                    {saveStatus.message}
                  </span>
                )}
              </div>
            </form>
          </div>

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
                        const sortable =
                          SORTABLE_RELATORIO_COLUMNS.includes(column);
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
                              sortable
                                ? () => setRelatorioSortColumn(column)
                                : undefined
                            }
                          >
                            {column}
                            {active ? " ▼" : ""}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRelatorio.map((row, index) => (
                      <tr key={row.faturaId ?? index}>
                        {relatorioColumns.map((column) => (
                          <td key={column}>{String(row[column] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
