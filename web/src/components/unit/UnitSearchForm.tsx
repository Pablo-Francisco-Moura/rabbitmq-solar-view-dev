import { parseSearchIds, parseSearchNomes } from "../../utils/unidadeIds.js";
import "../../css/units-search.css";

interface UnitSearchFormProps {
  searchText: string;
  onSearchTextChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  loading: boolean;
  fetchDone: number;
  fetchTotal: number;
  onCancel: () => void;
}

export default function UnitSearchForm({
  searchText,
  onSearchTextChange,
  onSubmit,
  loading,
  fetchDone,
  fetchTotal,
  onCancel,
}: UnitSearchFormProps) {
  return (
    <form className="units-search" onSubmit={onSubmit}>
      <label>
        Unidade ID (uma ou várias, separadas por espaço, vírgula ou linha) ou
        nome da unidade entre aspas duplas — pode misturar os dois
        <textarea
          rows={5}
          placeholder={
            'Ex: 712383\nou várias:\n466422\n935969\n935970\nou por nome:\n"UFV Sirius"\nou misturado:\n928153\n"UFV"'
          }
          value={searchText}
          onChange={(event) => onSearchTextChange(event.target.value)}
        />
      </label>
      <div className="units-search__actions">
        <button
          type="submit"
          disabled={
            (parseSearchIds(searchText).length === 0 &&
              parseSearchNomes(searchText).length === 0) ||
            loading
          }
        >
          {loading
            ? fetchTotal > 0
              ? `Buscando ${fetchDone}/${fetchTotal}…`
              : "Buscando…"
            : "Buscar"}
        </button>
        {loading && (
          <button
            type="button"
            className="units-search__cancel"
            onClick={onCancel}
            aria-label="Cancelar busca"
            title="Cancelar busca"
          >
            ×
          </button>
        )}
      </div>
    </form>
  );
}
