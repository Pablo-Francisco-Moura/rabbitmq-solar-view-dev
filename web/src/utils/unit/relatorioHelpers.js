export const RELATORIO_PRIORITY_COLUMNS = [
  "faturaId",
  "faturaMesReferencia",
  "faturaDataReferencia",
  "faturaCodigoInstalacao",
  "faturaNewCodigoInstalacao",
  "unidade_unidadeId",
  "faturaCriacao",
];
export const SORTABLE_RELATORIO_COLUMNS = [
  "faturaMesReferencia",
  "faturaDataReferencia",
];
export const RELATORIO_VISIBLE_ROWS = 12;

export function orderRelatorioColumns(sampleRow) {
  const keys = Object.keys(sampleRow);
  const priority = RELATORIO_PRIORITY_COLUMNS.filter((key) =>
    keys.includes(key),
  );
  const rest = keys.filter((key) => !RELATORIO_PRIORITY_COLUMNS.includes(key));
  return [...priority, ...rest];
}

export function relatorioColumnLabel(column) {
  return column === "faturaUrlArquivoRaw" ? "faturaUrlArquivo" : column;
}

export function getLastNMonths(n) {
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

export function formatMonthLabel(yearMonth) {
  const [year, month] = yearMonth.split("-");
  return `${month}/${year.slice(2)}`;
}

export function getMissingMonths(relatorio) {
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

// 'YYYY-MM-DD' (dateStrings:true no server) interpretado no fuso LOCAL do
// navegador - new Date('YYYY-MM-DD') direto interpreta como meia-noite UTC,
// e em fuso negativo (Brasil, UTC-3) getDate()/getMonth() voltam um dia.
function parseDateOnly(dateStr) {
  const [year, month, day] = String(dateStr).slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
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
  return latestReading ? parseDateOnly(latestReading) : null;
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

export function getUnidadeStatus(relatorio) {
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
