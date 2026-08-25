import { useEffect, useState } from "react";
import { getGestaoScee, getUnidadeNomes } from "../api.js";
import { parseUnidadeIds } from "../unidadeIds.js";

const STORAGE_KEY = "rabbitmq-solar-view-dev:units-page";

function loadStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function buildCopyText(groups, notFoundIds) {
  const blocks = groups.map((group) =>
    [
      group.geradoraId,
      ...group.beneficiarias.map((vinculo) => vinculo.unidadeBeneficiariaId),
    ].join("\n"),
  );
  for (const id of notFoundIds) blocks.push(String(id));
  return blocks.join("\n\n");
}

function groupByGeradora(vinculos) {
  const groups = new Map();
  for (const vinculo of vinculos) {
    const geradoraId = vinculo.unidadeGeradoraId;
    if (!groups.has(geradoraId)) groups.set(geradoraId, []);
    groups.get(geradoraId).push(vinculo);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([geradoraId, beneficiarias]) => ({
      geradoraId,
      beneficiarias: beneficiarias.sort(
        (a, b) => a.unidadeBeneficiariaId - b.unidadeBeneficiariaId,
      ),
    }));
}

export default function UnitsPage() {
  const [searchText, setSearchText] = useState(
    () => loadStoredState()?.searchText ?? "",
  );
  const [groups, setGroups] = useState(() => loadStoredState()?.groups ?? []);
  const [nomes, setNomes] = useState(() => loadStoredState()?.nomes ?? {});
  const [notFoundIds, setNotFoundIds] = useState(
    () => loadStoredState()?.notFoundIds ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const searchIds = parseUnidadeIds(searchText);
  const totalCopyIds =
    groups.reduce((sum, group) => sum + 1 + group.beneficiarias.length, 0) +
    notFoundIds.length;

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ searchText, groups, nomes, notFoundIds }),
      );
    } catch {
      // localStorage indisponivel (modo privado, storage cheio etc.) — segue sem persistir.
    }
  }, [searchText, groups, nomes, notFoundIds]);

  async function handleSearch(event) {
    event.preventDefault();
    if (searchIds.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      const vinculos = await getGestaoScee(searchIds);
      const nextGroups = groupByGeradora(vinculos);

      const touchedIds = new Set(
        vinculos.flatMap((v) => [v.unidadeGeradoraId, v.unidadeBeneficiariaId]),
      );
      const missing = searchIds.filter((id) => !touchedIds.has(id));

      const allIds = [...new Set([...touchedIds, ...searchIds])];
      const nextNomes = await getUnidadeNomes(allIds);

      setGroups(nextGroups);
      setNotFoundIds(missing);
      setNomes(nextNomes);
    } catch (err) {
      setGroups([]);
      setNotFoundIds([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyIds() {
    try {
      await navigator.clipboard.writeText(buildCopyText(groups, notFoundIds));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Não foi possível copiar para a área de transferência.");
    }
  }

  return (
    <div>
      <header className="app__header">
        <h1>Gerenciamento de Unidades</h1>
        <p>
          Busque unidades geradoras e/ou beneficiárias — misturadas, em qualquer
          ordem — e veja os vínculos de compensação (gestaoSCEE) agrupados por
          geradora.
        </p>
      </header>

      <form className="units-search" onSubmit={handleSearch}>
        <label>
          Unidade ID (uma ou várias, separadas por espaço, vírgula ou linha)
          <textarea
            rows={5}
            placeholder={
              "Ex: 466422\nou várias:\n940338\n940339\n466422\n935969\n935970\n955650"
            }
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </label>
        <button type="submit" disabled={searchIds.length === 0 || loading}>
          {loading ? "Buscando…" : "Buscar"}
        </button>
        <button
          type="button"
          onClick={handleCopyIds}
          disabled={totalCopyIds === 0}
        >
          {copied ? "Copiado!" : `Copiar IDs das unidades (${totalCopyIds})`}
        </button>
      </form>

      {error && <p className="app__error">{error}</p>}

      {notFoundIds.length > 0 && (
        <p className="app__error">
          Sem vínculo SCEE encontrado para: {notFoundIds.join(", ")}
        </p>
      )}

      {groups.map((group) => (
        <section key={group.geradoraId} className="units-details units-scee">
          <h2>
            Geradora: {group.geradoraId}
            {nomes[group.geradoraId] && ` — ${nomes[group.geradoraId]}`}
          </h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>unidadeBeneficiariaId</th>
                  <th>Nome</th>
                  <th>porcentagemDistribuicao</th>
                  <th>ordemPrioridade</th>
                  <th>recebeExcedente</th>
                  <th>created_at</th>
                  <th>updated_at</th>
                </tr>
              </thead>
              <tbody>
                {group.beneficiarias.map((vinculo) => (
                  <tr key={vinculo.id}>
                    <td>{vinculo.unidadeBeneficiariaId}</td>
                    <td>{nomes[vinculo.unidadeBeneficiariaId] ?? "—"}</td>
                    <td>{vinculo.porcentagemDistribuicao}</td>
                    <td>{vinculo.ordemPrioridade ?? "—"}</td>
                    <td>{vinculo.recebeExcedente ? "Sim" : "Não"}</td>
                    <td>{vinculo.created_at}</td>
                    <td>{vinculo.updated_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
