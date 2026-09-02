import type { SummaryRow } from "../../types/unidades.js";

export const NBSP = " ";

// Espaco comum some quando o usuario seleciona e copia manualmente (o
// destino colapsa/ignora espacos multiplos). Espaco nao-quebravel (nbsp)
// nao e' colapsado e nao aciona o modo "tabela" do Word como <table> aciona.
export function padStartNbsp(value: string, width: number): string {
  return NBSP.repeat(Math.max(0, width - value.length)) + value;
}

export function padEndNbsp(value: string, width: number): string {
  return value + NBSP.repeat(Math.max(0, width - value.length));
}

function buildSummaryLine(
  row: SummaryRow,
  idWidth: number,
  nomeWidth: number,
  aneelWidth: number,
): string {
  return `un: ${String(row.id).padStart(idWidth)} nome: ${row.nome.padEnd(
    nomeWidth,
  )} aneel: ${row.aneel.padEnd(aneelWidth)} - ${row.status.label}`;
}

export function buildSummaryPlainText(
  rows: SummaryRow[],
  idWidth: number,
  nomeWidth: number,
  aneelWidth: number,
): string {
  return rows
    .map((row) => buildSummaryLine(row, idWidth, nomeWidth, aneelWidth))
    .join("\n");
}

// Cores para o clipboard (Word, Gmail etc. colam em fundo branco) - nao usar
// as cores do tema escuro da tela aqui, ficam ilegiveis em fundo claro.
const SUMMARY_STATUS_COLORS: Record<string, string> = {
  ok: "#1e7e34",
  error: "#c0392b",
  warning: "#b8860b",
  neutral: "#1a1a1a",
};
const SUMMARY_LABEL_COLOR = "#666666";
const SUMMARY_VALUE_COLOR = "#1a1a1a";

function escapeHtml(value: unknown): string {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// <table> faz o Word converter para um objeto Table e aplicar o estilo de
// tabela padrao dele (ignorando a cor de cada celula). Por isso usamos
// spans soltos, com nbsp para o alinhamento sobreviver a colagem manual.
function summaryHtmlSpan(text: string, color: string): string {
  return `<span style="color:${color};font-family:Consolas,'Courier New',monospace;font-size:13px"><font color="${color}">${escapeHtml(text)}</font></span>`;
}

export function buildSummaryHtml(
  rows: SummaryRow[],
  idWidth: number,
  nomeWidth: number,
  aneelWidth: number,
): string {
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
