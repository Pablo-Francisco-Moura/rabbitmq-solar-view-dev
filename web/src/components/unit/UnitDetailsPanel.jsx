import AccordionSection from "./AccordionSection.jsx";
import "../../css/units-details.css";

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
const INTEGRADOR_SUMMARY_FIELDS = ["usuarioId", "usuNome", "usuEmail"];

export default function UnitDetailsPanel({ details, expandedSections, onToggleSection }) {
  return (
    <section className="units-details">
      <AccordionSection
        title="Unidade"
        data={details.unidade}
        summaryFields={UNIDADE_SUMMARY_FIELDS}
        expanded={expandedSections.unidade}
        onToggle={() => onToggleSection("unidade")}
        emptyMessage="Nenhuma unidade encontrada."
      />

      <AccordionSection
        title="Fatura Credencial"
        data={details.faturaCredencial}
        summaryFields={CREDENCIAL_SUMMARY_FIELDS}
        expanded={expandedSections.faturaCredencial}
        onToggle={() => onToggleSection("faturaCredencial")}
        emptyMessage="Nenhuma faturaCredencial encontrada para esta unidade."
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
        title="Integrador"
        data={details.integrador}
        summaryFields={INTEGRADOR_SUMMARY_FIELDS}
        expanded={expandedSections.integrador}
        onToggle={() => onToggleSection("integrador")}
        emptyMessage="Nenhum integrador encontrado para esta unidade."
      />
    </section>
  );
}
