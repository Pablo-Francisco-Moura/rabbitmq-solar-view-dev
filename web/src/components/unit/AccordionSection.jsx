import JsonFieldList from "../JsonFieldList.jsx";

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

export default function AccordionSection({
  title,
  data,
  summaryFields,
  expanded,
  onToggle,
  emptyMessage,
}) {
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
        />
      ) : (
        <p>{emptyMessage}</p>
      )}
    </>
  );
}
