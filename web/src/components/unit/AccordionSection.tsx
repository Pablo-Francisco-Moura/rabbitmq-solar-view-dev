import JsonFieldList from "../JsonFieldList.js";
import "../../css/accordion-section.css";

function orderFields(
  object: Record<string, unknown>,
  priorityFields: string[],
): Record<string, unknown> {
  const keys = Object.keys(object);
  const priority = priorityFields.filter((key) => keys.includes(key));
  const rest = keys.filter((key) => !priorityFields.includes(key));
  const ordered: Record<string, unknown> = {};
  for (const key of [...priority, ...rest]) ordered[key] = object[key];
  return ordered;
}

function pickFields(
  object: Record<string, unknown>,
  fields: string[],
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of fields) {
    if (key in object) picked[key] = object[key];
  }
  return picked;
}

interface AccordionSectionProps {
  title: string;
  data: Record<string, unknown> | null;
  summaryFields: string[];
  expanded: boolean;
  onToggle: () => void;
  emptyMessage: string;
  renderAction?: (key: string, value: unknown) => React.ReactNode;
}

export default function AccordionSection({
  title,
  data,
  summaryFields,
  expanded,
  onToggle,
  emptyMessage,
  renderAction,
}: AccordionSectionProps) {
  return (
    <>
      <div className="accordion-header" onClick={onToggle}>
        <h2>{title}</h2>
        {data && (
          <span className="accordion-toggle">
            {expanded ? "Mostrar menos ▲" : "Mostrar mais ▼"}
          </span>
        )}
      </div>
      {data ? (
        <JsonFieldList
          data={
            expanded ? orderFields(data, summaryFields) : pickFields(data, summaryFields)
          }
          renderAction={renderAction}
        />
      ) : (
        <p>{emptyMessage}</p>
      )}
    </>
  );
}
