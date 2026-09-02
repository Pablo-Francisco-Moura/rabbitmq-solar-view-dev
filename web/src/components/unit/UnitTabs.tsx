import "../../css/units-tabs.css";
import type { UnidadeDetails } from "../../types/unidades.js";

interface UnitTabsProps {
  foundIds: number[];
  selectedId: number | null;
  resultsById: Record<number, UnidadeDetails>;
  onSelect: (id: number) => void;
  onRemove: (id: number) => void;
}

export default function UnitTabs({
  foundIds,
  selectedId,
  resultsById,
  onSelect,
  onRemove,
}: UnitTabsProps) {
  return (
    <div className="units-tabs">
      {foundIds.map((id) => (
        <div
          key={id}
          role="button"
          tabIndex={0}
          className={`units-tabs__button${
            id === selectedId ? " units-tabs__button--active" : ""
          }`}
          onClick={() => onSelect(id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(id);
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
              onRemove(id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
