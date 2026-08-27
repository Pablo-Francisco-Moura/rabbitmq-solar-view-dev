import { useEffect, useRef, useState } from "react";
import {
  getUnidadeDetails,
  updateUnidadeInstallationCodes,
  extractFatura,
} from "../api.js";
import { parseUnidadeIds } from "../unidadeIds.js";

const STORAGE_KEY = "rabbitmq-solar-view-dev:unit-page";
const RELATORIO_PRIORITY_COLUMNS = [
  "faturaId",
  "faturaMesReferencia",
  "faturaDataReferencia",
  "faturaCodigoInstalacao",
  "faturaNewCodigoInstalacao",
  "unidade_unidadeId",
  "faturaCriacao",
];
const SORTABLE_RELATORIO_COLUMNS = [
  "faturaMesReferencia",
  "faturaDataReferencia",
];
const UNIDADE_SUMMARY_FIELDS = [
  "unidadeId",
  "uniNome",
  "uniIntegradorResponsavel",
  "concessionaria_concessionariaId",
  "faturaCodigoInstalacao",
  "faturaNewCodigoInstalacao",
  "uniAtiva",
  "uniExcluida",
];
const CREDENCIAL_SUMMARY_FIELDS = [
  "faturaCredencialId",
  "unidade_unidadeId",
  "usuario_usuarioId",
  "concessionaria_concessionariaId",
  "user",
  "password",
  "faturaCodigoInstalacao",
  "faturaNewCodigoInstalacao",
  "faturaCodigoContrato",
  "faturaCodigoCliente",
  "birthdate",
  "email",
  "cpf",
  "email_integracao",
  "credencialAtiva",
  "flagExcluida",
];
const CONCESSIONARIA_SUMMARY_FIELDS = ["concessionariaId", "nomeConcessionaria"];
const RELATORIO_VISIBLE_ROWS = 12;

function orderFields(object, priorityFields) {
  const keys = Object.keys(object);
  const priority = priorityFields.filter((key) => keys.includes(key));
  const rest = keys.filter((key) => !priorityFields.includes(key));
  const ordered = {};
  for (const key of [...priority, ...rest]) ordered[key] = object[key];
  return ordered;
}

function pickFields(object, fields) {
  const picked = {};
  for (const key of fields) {
    if (key in object) picked[key] = object[key];
  }
  return picked;
}

function formatFieldValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden="true"
    >
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.3" />
      <path d="M3.5 10.5h-1a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

function CopyableField({ label, value }) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const hoverTimeoutRef = useRef(null);

  function handleMouseEnter() {
    hoverTimeoutRef.current = setTimeout(() => setTooltipVisible(true), 2000);
  }

  function handleMouseLeave() {
    clearTimeout(hoverTimeoutRef.current);
    setTooltipVisible(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatFieldValue(value));
      setCopied(true);
      setTooltipVisible(false);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard indisponivel (permissao negada, contexto nao seguro etc.)
    }
  }

  return (
    <div
      className="json-field"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className="json-field__copy"
        onClick={handleCopy}
        aria-label={`Copiar ${label}`}
      >
        {copied ? "✓" : <CopyIcon />}
      </button>
      <span className="json-field__key">{label}:</span>
      <span className="json-field__value">{formatFieldValue(value)}</span>
      {tooltipVisible && !copied && (
        <span className="json-field__tooltip">Copiar {label}</span>
      )}
    </div>
  );
}

function JsonFieldList({ data }) {
  return (
    <div className="json-field-list">
      {Object.entries(data).map(([key, value]) => (
        <CopyableField key={key} label={key} value={value} />
      ))}
    </div>
  );
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
  const priority = RELATORIO_PRIORITY_COLUMNS.filter((key) =>
    keys.includes(key),
  );
  const rest = keys.filter((key) => !RELATORIO_PRIORITY_COLUMNS.includes(key));
  return [...priority, ...rest];
}

function relatorioColumnLabel(column) {
  return column === "faturaUrlArquivoRaw" ? "faturaUrlArquivo" : column;
}

function getLastNMonths(n) {
  const months = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    );
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
    if (row.faturaMesReferencia)
      present.add(String(row.faturaMesReferencia).slice(0, 7));
    if (row.faturaDataReferencia)
      present.add(String(row.faturaDataReferencia).slice(0, 7));
  }
  return getLastNMonths(12)
    .filter((month) => !present.has(month))
    .reverse();
}

// Ultima linha do relatorio com faturaDataLeituraAtual preenchida (mes mais
// recente presente) - usada pra estimar quando a proxima fatura deve sair.
function getLastReadingDate(relatorio) {
  let latestMonth = "";
  let latestReading = null;
  for (const row of relatorio) {
    if (!row.faturaDataLeituraAtual) continue;
    const month = row.faturaMesReferencia
      ? String(row.faturaMesReferencia).slice(0, 7)
      : row.faturaDataReferencia
        ? String(row.faturaDataReferencia).slice(0, 7)
        : "";
    if (month && month > latestMonth) {
      latestMonth = month;
      latestReading = row.faturaDataLeituraAtual;
    }
  }
  return latestReading ? new Date(latestReading) : null;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateBR(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function getUnidadeStatus(relatorio) {
  const missing = getMissingMonths(relatorio);
  if (missing.length === 0) return { label: "OK", tone: "ok" };
  const currentMonth = getLastNMonths(1)[0];
  const onlyCurrentMonthMissing =
    missing.length === 1 && missing[0] === currentMonth;
  if (onlyCurrentMonthMissing) {
    const monthLabel = formatMonthLabel(missing[0]);
    const lastReading = getLastReadingDate(relatorio);
    if (!lastReading) return { label: monthLabel, tone: "neutral" };
    const expectedAvailableFrom = addDays(lastReading, 31);
    const overdue = new Date() >= expectedAvailableFrom;
    return {
      label: `${monthLabel} última leitura: ${formatDateBR(lastReading)}`,
      tone: overdue ? "warning" : "neutral",
    };
  }
  return {
    label: missing.map(formatMonthLabel).join(" - "),
    tone: "error",
  };
}

const NBSP = " ";

// Espaco comum some quando o usuario seleciona e copia manualmente (o
// destino colapsa/ignora espacos multiplos). Espaco nao-quebravel (nbsp)
// nao e' colapsado e nao aciona o modo "tabela" do Word como <table> aciona.
function padStartNbsp(value, width) {
  return NBSP.repeat(Math.max(0, width - value.length)) + value;
}

function padEndNbsp(value, width) {
  return value + NBSP.repeat(Math.max(0, width - value.length));
}

function buildSummaryLine(row, idWidth, nomeWidth, aneelWidth) {
  return `un: ${String(row.id).padStart(idWidth)} nome: ${row.nome.padEnd(
    nomeWidth,
  )} aneel: ${row.aneel.padEnd(aneelWidth)} - ${row.status.label}`;
}

function buildSummaryPlainText(rows, idWidth, nomeWidth, aneelWidth) {
  return rows
    .map((row) => buildSummaryLine(row, idWidth, nomeWidth, aneelWidth))
    .join("\n");
}

// Cores para o clipboard (Word, Gmail etc. colam em fundo branco) - nao usar
// as cores do tema escuro da tela aqui, ficam ilegiveis em fundo claro.
const SUMMARY_STATUS_COLORS = {
  ok: "#1e7e34",
  error: "#c0392b",
  warning: "#b8860b",
  neutral: "#1a1a1a",
};
const SUMMARY_LABEL_COLOR = "#666666";
const SUMMARY_VALUE_COLOR = "#1a1a1a";

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// <table> faz o Word converter para um objeto Table e aplicar o estilo de
// tabela padrao dele (ignorando a cor de cada celula). Por isso usamos
// spans soltos, com nbsp para o alinhamento sobreviver a colagem manual.
function summaryHtmlSpan(text, color) {
  return `<span style="color:${color};font-family:Consolas,'Courier New',monospace;font-size:13px"><font color="${color}">${escapeHtml(text)}</font></span>`;
}

function buildSummaryHtml(rows, idWidth, nomeWidth, aneelWidth) {
  const lines = rows.map((row) => {
    const statusColor = SUMMARY_STATUS_COLORS[row.status.tone] || SUMMARY_VALUE_COLOR;
    return (
      `<div>` +
      summaryHtmlSpan(`un:${NBSP}`, SUMMARY_LABEL_COLOR) +
      summaryHtmlSpan(padStartNbsp(String(row.id), idWidth), SUMMARY_VALUE_COLOR) +
      summaryHtmlSpan(`${NBSP}nome:${NBSP}`, SUMMARY_LABEL_COLOR) +
      summaryHtmlSpan(padEndNbsp(row.nome, nomeWidth), SUMMARY_VALUE_COLOR) +
      summaryHtmlSpan(`${NBSP}aneel:${NBSP}`, SUMMARY_LABEL_COLOR) +
      summaryHtmlSpan(padEndNbsp(row.aneel, aneelWidth), SUMMARY_VALUE_COLOR) +
      summaryHtmlSpan(`${NBSP}-${NBSP}`, SUMMARY_LABEL_COLOR) +
      summaryHtmlSpan(row.status.label, statusColor) +
      `</div>`
    );
  });
  return `<div style="white-space:pre;">${lines.join("")}</div>`;
}

export default function UnitPage() {
  const [searchText, setSearchText] = useState(
    () => loadStoredState()?.searchText ?? "",
  );
  const [resultsById, setResultsById] = useState(
    () => loadStoredState()?.resultsById ?? {},
  );
  const [foundIds, setFoundIds] = useState(
    () => loadStoredState()?.foundIds ?? [],
  );
  const [selectedId, setSelectedId] = useState(
    () => loadStoredState()?.selectedId ?? null,
  );
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchDone, setFetchDone] = useState(0);
  const [fetchTotal, setFetchTotal] = useState(0);

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
  const [expandedSections, setExpandedSections] = useState({
    unidade: false,
    faturaCredencial: false,
    concessionaria: false,
  });
  const [showAllRelatorio, setShowAllRelatorio] = useState(false);
  const [pdfModalUrl, setPdfModalUrl] = useState(null);
  const [extracting, setExtracting] = useState(null);
  const [extractResult, setExtractResult] = useState(null);
  const [extractError, setExtractError] = useState(null);
  const [summaryCopied, setSummaryCopied] = useState(false);

  function toggleSection(name) {
    setExpandedSections((current) => ({
      ...current,
      [name]: !current[name],
    }));
  }

  function openPdfModal(url) {
    setPdfModalUrl(url);
    setExtracting(null);
    setExtractResult(null);
    setExtractError(null);
  }

  function closePdfModal() {
    setPdfModalUrl(null);
    setExtracting(null);
    setExtractResult(null);
    setExtractError(null);
  }

  async function handleExtract(env) {
    const companyId = details?.unidade?.concessionaria_concessionariaId;
    if (!pdfModalUrl || !Number.isInteger(companyId)) return;
    setExtracting(env);
    setExtractError(null);
    try {
      const result = await extractFatura(env, companyId, pdfModalUrl);
      setExtractResult(result);
    } catch (err) {
      setExtractError(err.message);
      setExtractResult(null);
    } finally {
      setExtracting(null);
    }
  }

  async function handleCopySummary() {
    const text = buildSummaryPlainText(
      unidadeSummaryRows,
      summaryIdWidth,
      summaryNomeWidth,
      summaryAneelWidth,
    );
    const html = buildSummaryHtml(
      unidadeSummaryRows,
      summaryIdWidth,
      summaryNomeWidth,
      summaryAneelWidth,
    );
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
      setSummaryCopied(true);
      setTimeout(() => setSummaryCopied(false), 1500);
    } catch {
      // clipboard indisponivel (permissao negada, contexto nao seguro etc.)
    }
  }

  useEffect(() => {
    if (!pdfModalUrl) return;
    function handleKeyDown(event) {
      if (event.key === "Escape") closePdfModal();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pdfModalUrl]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          searchText,
          resultsById,
          foundIds,
          selectedId,
          faturaCodigoInstalacao,
          faturaNewCodigoInstalacao,
        }),
      );
    } catch {
      // localStorage indisponivel (modo privado, storage cheio etc.) — segue sem persistir.
    }
  }, [
    searchText,
    resultsById,
    foundIds,
    selectedId,
    faturaCodigoInstalacao,
    faturaNewCodigoInstalacao,
  ]);

  function selectUnidade(id, resultsSource) {
    setSelectedId(id);
    const data = id != null ? resultsSource[id] : null;
    setFaturaCodigoInstalacao(data?.unidade.faturaCodigoInstalacao ?? "");
    setFaturaNewCodigoInstalacao(data?.unidade.faturaNewCodigoInstalacao ?? "");
    setRelatorioSortColumn("faturaMesReferencia");
    setExpandedSections({
      unidade: false,
      faturaCredencial: false,
      concessionaria: false,
    });
    setShowAllRelatorio(false);
  }

  async function handleSearch(event) {
    event.preventDefault();
    const ids = parseUnidadeIds(searchText);
    if (ids.length === 0) return;

    setLoading(true);
    setFetchDone(0);
    setFetchTotal(ids.length);
    setError(null);
    setSaveStatus(null);

    const nextResults = {};
    const failures = [];
    for (const id of ids) {
      try {
        nextResults[id] = await getUnidadeDetails(id);
      } catch (err) {
        failures.push({ id, message: err.message });
      }
      setFetchDone((current) => current + 1);
    }
    setLoading(false);

    const foundNow = ids.filter((id) => nextResults[id]);
    setResultsById(nextResults);
    setFoundIds(foundNow);
    selectUnidade(foundNow[0] ?? null, nextResults);

    if (failures.length > 0) {
      setError(
        `${foundNow.length}/${ids.length} encontradas. Falhas: ${failures
          .map((failure) => `${failure.id}: ${failure.message}`)
          .join("; ")}`,
      );
    }
  }

  function handleSelectUnidade(id) {
    if (id === selectedId) return;
    setSaveStatus(null);
    selectUnidade(id, resultsById);
  }

  function handleRemoveUnidade(id) {
    const nextFoundIds = foundIds.filter((foundId) => foundId !== id);
    const nextResultsById = { ...resultsById };
    delete nextResultsById[id];

    setFoundIds(nextFoundIds);
    setResultsById(nextResultsById);
    setSaveStatus(null);

    if (id === selectedId) {
      selectUnidade(nextFoundIds[0] ?? null, nextResultsById);
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    if (selectedId == null || !resultsById[selectedId]) return;
    if (
      !window.confirm(
        `Atualizar codigo de instalacao e novo codigo de instalacao da unidade ${selectedId} nas tabelas unidade e faturaCredencial? Essa ação não pode ser desfeita.`,
      )
    )
      return;

    setSaving(true);
    setSaveStatus(null);
    try {
      const data = await updateUnidadeInstallationCodes(selectedId, {
        faturaCodigoInstalacao,
        faturaNewCodigoInstalacao,
      });
      setResultsById((current) => ({ ...current, [selectedId]: data }));
      setSaveStatus({ ok: true, message: "Códigos atualizados." });
    } catch (err) {
      setSaveStatus({ ok: false, message: err.message });
    } finally {
      setSaving(false);
    }
  }

  const details = selectedId != null ? resultsById[selectedId] : null;
  const relatorio = details?.faturaRelatorioEnergetico ?? [];
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

  const unidadeSummaryRows = foundIds.map((id) => ({
    id,
    nome: resultsById[id]?.unidade?.uniNome ?? "",
    aneel:
      resultsById[id]?.concessionaria?.sig_agente ||
      resultsById[id]?.concessionaria?.nomeGrupo ||
      "",
    status: getUnidadeStatus(resultsById[id]?.faturaRelatorioEnergetico ?? []),
  }));
  const summaryIdWidth = Math.max(
    0,
    ...unidadeSummaryRows.map((row) => String(row.id).length),
  );
  const summaryNomeWidth = Math.max(
    0,
    ...unidadeSummaryRows.map((row) => row.nome.length),
  );
  const summaryAneelWidth = Math.max(
    0,
    ...unidadeSummaryRows.map((row) => row.aneel.length),
  );

  return (
    <div>
      <header className="app__header">
        <h1>Informações da Unidade</h1>
      </header>

      <form className="units-search" onSubmit={handleSearch}>
        <label>
          Unidade ID (uma ou várias, separadas por espaço, vírgula ou linha)
          <textarea
            rows={5}
            placeholder={"Ex: 712383\nou várias:\n466422\n935969\n935970"}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={parseUnidadeIds(searchText).length === 0 || loading}
        >
          {loading ? `Buscando ${fetchDone}/${fetchTotal}…` : "Buscar"}
        </button>
      </form>

      {foundIds.length > 0 && (
        <div className="units-tabs">
          {foundIds.map((id) => (
            <div
              key={id}
              role="button"
              tabIndex={0}
              className={`units-tabs__button${
                id === selectedId ? " units-tabs__button--active" : ""
              }`}
              onClick={() => handleSelectUnidade(id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleSelectUnidade(id);
                }
              }}
            >
              <strong>{id}</strong>
              {resultsById[id]?.unidade?.uniNome && (
                <span>{resultsById[id].unidade.uniNome}</span>
              )}
              <button
                type="button"
                className="units-tabs__remove"
                aria-label={`Remover unidade ${id}`}
                onClick={(event) => {
                  event.stopPropagation();
                  handleRemoveUnidade(id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="app__error">{error}</p>}

      {details && (
        <>
          <div className="app__grid">
            <section className="units-details">
              <div
                className="accordion-header"
                onClick={() => toggleSection("unidade")}
              >
                <h2>Unidade</h2>
                <span className="accordion-toggle">
                  {expandedSections.unidade
                    ? "Mostrar menos ▲"
                    : "Mostrar mais ▼"}
                </span>
              </div>
              <JsonFieldList
                data={
                  expandedSections.unidade
                    ? orderFields(details.unidade, UNIDADE_SUMMARY_FIELDS)
                    : pickFields(details.unidade, UNIDADE_SUMMARY_FIELDS)
                }
              />

              <div
                className="accordion-header"
                onClick={() => toggleSection("faturaCredencial")}
              >
                <h2>Fatura Credencial</h2>
                {details.faturaCredencial && (
                  <span className="accordion-toggle">
                    {expandedSections.faturaCredencial
                      ? "Mostrar menos ▲"
                      : "Mostrar mais ▼"}
                  </span>
                )}
              </div>
              {details.faturaCredencial ? (
                <JsonFieldList
                  data={
                    expandedSections.faturaCredencial
                      ? orderFields(
                          details.faturaCredencial,
                          CREDENCIAL_SUMMARY_FIELDS,
                        )
                      : pickFields(
                          details.faturaCredencial,
                          CREDENCIAL_SUMMARY_FIELDS,
                        )
                  }
                />
              ) : (
                <p>Nenhuma faturaCredencial encontrada para esta unidade.</p>
              )}

              <div
                className="accordion-header"
                onClick={() => toggleSection("concessionaria")}
              >
                <h2>Concessionária</h2>
                {details.concessionaria && (
                  <span className="accordion-toggle">
                    {expandedSections.concessionaria
                      ? "Mostrar menos ▲"
                      : "Mostrar mais ▼"}
                  </span>
                )}
              </div>
              {details.concessionaria ? (
                <JsonFieldList
                  data={
                    expandedSections.concessionaria
                      ? orderFields(
                          details.concessionaria,
                          CONCESSIONARIA_SUMMARY_FIELDS,
                        )
                      : pickFields(
                          details.concessionaria,
                          CONCESSIONARIA_SUMMARY_FIELDS,
                        )
                  }
                />
              ) : (
                <p>Nenhuma concessionária encontrada para esta unidade.</p>
              )}
            </section>

            <div className="app__grid-col">
              <form className="publish-form" onSubmit={handleSave}>
                <h2>Atualizar códigos de instalação</h2>
                <p>
                  Atualiza <code>faturaCodigoInstalacao</code> e{" "}
                  <code>faturaNewCodigoInstalacao</code> nas tabelas{" "}
                  <code>unidade</code> e <code>faturaCredencial</code> desta
                  unidade. Nenhum outro campo é alterado.
                </p>

                <div className="publish-form__row">
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
                </div>

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

              {unidadeSummaryRows.length > 0 && (
                <section className="units-details units-summary">
                  <div className="units-summary__header">
                    <h2>Faturas ausentes</h2>
                    <button type="button" onClick={handleCopySummary}>
                      {summaryCopied ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                  <div className="units-summary__list">
                    {unidadeSummaryRows.map((row) => (
                      <div className="units-summary__row" key={row.id}>
                        <span className="units-summary__label">un:{NBSP}</span>
                        <span className="units-summary__value">
                          {padStartNbsp(String(row.id), summaryIdWidth)}
                        </span>
                        <span className="units-summary__label">
                          {NBSP}nome:{NBSP}
                        </span>
                        <span className="units-summary__value">
                          {padEndNbsp(row.nome, summaryNomeWidth)}
                        </span>
                        <span className="units-summary__label">
                          {NBSP}aneel:{NBSP}
                        </span>
                        <span className="units-summary__value">
                          {padEndNbsp(row.aneel, summaryAneelWidth)}
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
              )}
            </div>
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
                              <td key={column}>
                                {String(row.faturaUrlArquivo ?? "")}
                              </td>
                            );
                          }
                          const value = row[column];
                          if (column === "faturaUrlArquivo" && value) {
                            return (
                              <td key={column}>
                                <button
                                  type="button"
                                  className="units-relatorio__pdf-link"
                                  title={value}
                                  onClick={() => openPdfModal(value)}
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
                {showAllRelatorio &&
                  sortedRelatorio.length > RELATORIO_VISIBLE_ROWS && (
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
        </>
      )}

      {pdfModalUrl && (
        <div className="pdf-modal-overlay" onClick={closePdfModal}>
          <div
            className="pdf-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pdf-modal__header">
              <h3>Fatura (PDF)</h3>
              <button
                type="button"
                className="pdf-modal__close"
                aria-label="Fechar"
                onClick={closePdfModal}
              >
                ×
              </button>
            </div>
            <div className="pdf-modal__body">
              <iframe
                src={`${pdfModalUrl}#zoom=125`}
                title="Fatura PDF"
                className="pdf-modal__frame"
              />
              <div className="pdf-modal__sidebar">
                <div className="pdf-modal__extract-actions">
                  <button
                    type="button"
                    disabled={extracting != null}
                    onClick={() => handleExtract("prod")}
                  >
                    {extracting === "prod" ? "Extraindo…" : "Extrair Prod"}
                  </button>
                  <button
                    type="button"
                    disabled={extracting != null}
                    onClick={() => handleExtract("local")}
                  >
                    {extracting === "local" ? "Extraindo…" : "Extrair Local"}
                  </button>
                </div>
                <div className="pdf-modal__extract-result">
                  {extractError && <p className="app__error">{extractError}</p>}
                  {extractResult && (
                    <pre>{JSON.stringify(extractResult, null, 2)}</pre>
                  )}
                  {!extractError && !extractResult && (
                    <p className="pdf-modal__extract-placeholder">
                      Clique em "Extrair Prod" ou "Extrair Local" para rodar a
                      extração desta fatura.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
