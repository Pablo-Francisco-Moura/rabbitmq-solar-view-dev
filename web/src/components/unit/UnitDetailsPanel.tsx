import AccordionSection from "./AccordionSection.js";
import AcessarIntegradorButton from "./AcessarIntegradorButton.js";
import FieldWarningIcon from "./FieldWarningIcon.js";
import NavegarButton from "./NavegarButton.js";
import "../../css/units-details.css";
import type { UnidadeDetails } from "../../types/unidades.js";

interface FlagWarningRule {
  when: (value: unknown) => boolean;
  message: string;
}

function flagWarningAction(
  rules: Record<string, FlagWarningRule>,
): (key: string, value: unknown) => React.ReactNode {
  return (key, value) => {
    const rule = rules[key];
    if (!rule || !rule.when(value)) return null;
    return <FieldWarningIcon message={rule.message} />;
  };
}

function isFlag(value: unknown, expected: number): boolean {
  return value != null && Number(value) === expected;
}

const UNIDADE_FIELD_ACTIONS = flagWarningAction({
  uniAtiva: { when: (v) => isFlag(v, 0), message: "Unidade inativa" },
  uniExcluida: { when: (v) => isFlag(v, 1), message: "Unidade excluída" },
});

const CREDENCIAL_FIELD_ACTIONS = flagWarningAction({
  credencialAtiva: { when: (v) => isFlag(v, 0), message: "Credencial inativa" },
  flagExcluida: { when: (v) => isFlag(v, 1), message: "Credencial excluída" },
});

const CREDENCIAL_USINA_FIELD_ACTIONS = flagWarningAction({
  credencialAtiva: {
    when: (v) => isFlag(v, 0),
    message: "Credencial de usina inativa",
  },
  flagExcluida: {
    when: (v) => isFlag(v, 1),
    message: "Credencial de usina excluída",
  },
});

function portalFieldAction(key: string, value: unknown): React.ReactNode {
  if (key !== "portalUrl" || !value) return null;
  return <NavegarButton url={String(value)} />;
}

const UNIDADE_SUMMARY_FIELDS = [
  "unidadeId",
  "uniNome",
  "faturaCodigoInstalacao",
  "faturaNewCodigoInstalacao",
  "uniAtiva",
  "uniExcluida",
];
const CREDENCIAL_SUMMARY_FIELDS = [
  "faturaCredencialId",
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
const UNIDADE_TERCEIRA_SUMMARY_FIELDS = [
  "unidadesTerceirasId",
  "unidadesTerceiras_unidadeIdTerceira",
  "monitorada",
];
const CREDENCIAL_USINA_SUMMARY_FIELDS = [
  "credencialId",
  "userName",
  "password",
  "credencialAtiva",
  "flagExcluida",
];
const PORTAL_SUMMARY_FIELDS = ["portalId", "portalNome", "portalAtivo", "portalUrl"];
const CREDENCIAL_STATUS_SUMMARY_FIELDS = [
  "statusIntegracaoNome",
  "statusIntegracaoID",
];
const INTEGRADOR_SUMMARY_FIELDS = ["usuEmail"];

export interface ExpandedSections {
  unidade: boolean;
  faturaCredencial: boolean;
  concessionaria: boolean;
  unidadeTerceira: boolean;
  credencialUsina: boolean;
  portal: boolean;
  credencialStatus: boolean;
  integrador: boolean;
}

interface UnitDetailsPanelProps {
  details: UnidadeDetails;
  expandedSections: ExpandedSections;
  onToggleSection: (name: keyof ExpandedSections) => void;
}

export default function UnitDetailsPanel({ details, expandedSections, onToggleSection }: UnitDetailsPanelProps) {
  return (
    <section className="units-details">
      <AccordionSection
        title="Unidade"
        data={details.unidade}
        summaryFields={UNIDADE_SUMMARY_FIELDS}
        expanded={expandedSections.unidade}
        onToggle={() => onToggleSection("unidade")}
        emptyMessage="Nenhuma unidade encontrada."
        renderAction={UNIDADE_FIELD_ACTIONS}
      />

      <AccordionSection
        title="Fatura Credencial"
        data={details.faturaCredencial}
        summaryFields={CREDENCIAL_SUMMARY_FIELDS}
        expanded={expandedSections.faturaCredencial}
        onToggle={() => onToggleSection("faturaCredencial")}
        emptyMessage="Nenhuma faturaCredencial encontrada para esta unidade."
        renderAction={CREDENCIAL_FIELD_ACTIONS}
      />

      <AccordionSection
        title="Concessionária"
        data={details.concessionaria}
        summaryFields={CONCESSIONARIA_SUMMARY_FIELDS}
        expanded={expandedSections.concessionaria}
        onToggle={() => onToggleSection("concessionaria")}
        emptyMessage="Nenhuma concessionária encontrada para esta unidade."
      />

      <AccordionSection
        title="Unidade (Terceira)"
        data={details.unidadeTerceira}
        summaryFields={UNIDADE_TERCEIRA_SUMMARY_FIELDS}
        expanded={expandedSections.unidadeTerceira}
        onToggle={() => onToggleSection("unidadeTerceira")}
        emptyMessage="Nenhuma unidade terceira encontrada para esta unidade."
      />

      <AccordionSection
        title="Portal"
        data={details.portal}
        summaryFields={PORTAL_SUMMARY_FIELDS}
        expanded={expandedSections.portal}
        onToggle={() => onToggleSection("portal")}
        emptyMessage="Nenhum portal encontrado para esta credencial de usina."
        renderAction={portalFieldAction}
      />

      <AccordionSection
        title="Credencial (Usina)"
        data={details.credencialUsina}
        summaryFields={CREDENCIAL_USINA_SUMMARY_FIELDS}
        expanded={expandedSections.credencialUsina}
        onToggle={() => onToggleSection("credencialUsina")}
        emptyMessage="Nenhuma credencial de usina encontrada para esta unidade."
        renderAction={CREDENCIAL_USINA_FIELD_ACTIONS}
      />

      <AccordionSection
        title="Credencial (Status)"
        data={details.credencialStatus}
        summaryFields={CREDENCIAL_STATUS_SUMMARY_FIELDS}
        expanded={expandedSections.credencialStatus}
        onToggle={() => onToggleSection("credencialStatus")}
        emptyMessage="Nenhum status de integração encontrado para esta credencial de usina."
      />

      <AccordionSection
        title="Integrador"
        data={details.integrador}
        summaryFields={INTEGRADOR_SUMMARY_FIELDS}
        expanded={expandedSections.integrador}
        onToggle={() => onToggleSection("integrador")}
        emptyMessage="Nenhum integrador encontrado para esta unidade."
        renderAction={(key, value) => {
          if (key !== "usuEmail" || !details.integrador) return null;
          const usuarioId = Number(details.integrador.usuarioId);
          if (!Number.isInteger(usuarioId) || usuarioId <= 0) return null;
          return (
            <AcessarIntegradorButton
              usuarioId={usuarioId}
              usuNome={String(details.integrador.usuNome ?? "")}
              usuEmail={String(value ?? "")}
            />
          );
        }}
      />
    </section>
  );
}
