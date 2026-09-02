import { useEffect, useRef, useState } from "react";
import {
  getUnidadeDetails,
  updateUnidadeInstallationCodes,
  searchUnidadesByNome,
} from "../api/unidades.js";
import { parseSearchIds, parseSearchNomes } from "../unidadeIds.js";
import UnitSearchForm from "../components/unit/UnitSearchForm.jsx";
import UnitTabs from "../components/unit/UnitTabs.jsx";
import UnitDetailsPanel from "../components/unit/UnitDetailsPanel.jsx";
import InstallationCodesForm from "../components/unit/InstallationCodesForm.jsx";
import FaturasAusentesSummary from "../components/unit/FaturasAusentesSummary.jsx";
import FaturaRelatorioTable from "../components/unit/FaturaRelatorioTable.jsx";
import FaturaPdfModal from "../components/unit/FaturaPdfModal.jsx";

const STORAGE_KEY = "rabbitmq-solar-view-dev:unit-page";
const LARGE_SEARCH_CONFIRM_THRESHOLD = 50;

function loadStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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
  const cancelSearchRef = useRef(false);

  const [faturaCodigoInstalacao, setFaturaCodigoInstalacao] = useState(
    () => loadStoredState()?.faturaCodigoInstalacao ?? "",
  );
  const [faturaNewCodigoInstalacao, setFaturaNewCodigoInstalacao] = useState(
    () => loadStoredState()?.faturaNewCodigoInstalacao ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    unidade: false,
    faturaCredencial: false,
    concessionaria: false,
    integrador: false,
  });
  const [pdfModalUrl, setPdfModalUrl] = useState(null);

  function toggleSection(name) {
    setExpandedSections((current) => ({
      ...current,
      [name]: !current[name],
    }));
  }

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
    setExpandedSections({
      unidade: false,
      faturaCredencial: false,
      concessionaria: false,
      integrador: false,
    });
  }

  function handleCancelSearch() {
    cancelSearchRef.current = true;
  }

  async function fetchUnidadesByIds(ids) {
    cancelSearchRef.current = false;
    setLoading(true);
    setFetchDone(0);
    setFetchTotal(ids.length);

    const nextResults = {};
    const failures = [];
    let cancelled = false;
    for (const id of ids) {
      if (cancelSearchRef.current) {
        cancelled = true;
        break;
      }
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

    if (cancelled) {
      setError(
        `Busca cancelada. ${foundNow.length}/${ids.length} unidades carregadas antes do cancelamento.`,
      );
    } else if (failures.length > 0) {
      setError(
        `${foundNow.length}/${ids.length} encontradas. Falhas: ${failures
          .map((failure) => `${failure.id}: ${failure.message}`)
          .join("; ")}`,
      );
    }
  }

  async function handleSearch(event) {
    event.preventDefault();
    const trimmed = searchText.trim();
    if (!trimmed) return;

    setError(null);
    setSaveStatus(null);

    const directIds = parseSearchIds(trimmed);
    const nomes = parseSearchNomes(trimmed);
    if (directIds.length === 0 && nomes.length === 0) return;

    const idSet = new Set(directIds);

    if (nomes.length > 0) {
      setLoading(true);
      setFetchDone(0);
      setFetchTotal(0);
      try {
        const results = await Promise.all(
          nomes.map((nome) => searchUnidadesByNome(nome)),
        );
        for (const found of results.flat()) idSet.add(found.unidadeId);
      } catch (err) {
        setLoading(false);
        setError(err.message);
        return;
      }
    }

    const ids = [...idSet];
    if (ids.length === 0) {
      setLoading(false);
      setError(
        `Nenhuma unidade encontrada para ${nomes
          .map((nome) => `"${nome}"`)
          .join(", ")}.`,
      );
      setResultsById({});
      setFoundIds([]);
      selectUnidade(null, {});
      return;
    }

    if (
      ids.length > LARGE_SEARCH_CONFIRM_THRESHOLD &&
      !window.confirm(
        `Essa busca vai carregar ${ids.length} unidades, uma por vez. Isso pode demorar. Deseja continuar?`,
      )
    ) {
      setLoading(false);
      return;
    }

    await fetchUnidadesByIds(ids);
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

  return (
    <div>
      <header className="app__header">
        <h1>Informações da Unidade</h1>
      </header>

      <UnitSearchForm
        searchText={searchText}
        onSearchTextChange={setSearchText}
        onSubmit={handleSearch}
        loading={loading}
        fetchDone={fetchDone}
        fetchTotal={fetchTotal}
        onCancel={handleCancelSearch}
      />

      {foundIds.length > 0 && (
        <UnitTabs
          foundIds={foundIds}
          selectedId={selectedId}
          resultsById={resultsById}
          onSelect={handleSelectUnidade}
          onRemove={handleRemoveUnidade}
        />
      )}

      {error && <p className="app__error">{error}</p>}

      {details && (
        <>
          <div className="app__grid">
            <UnitDetailsPanel
              details={details}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
            />

            <div className="app__grid-col">
              <InstallationCodesForm
                faturaCodigoInstalacao={faturaCodigoInstalacao}
                onFaturaCodigoInstalacaoChange={setFaturaCodigoInstalacao}
                faturaNewCodigoInstalacao={faturaNewCodigoInstalacao}
                onFaturaNewCodigoInstalacaoChange={setFaturaNewCodigoInstalacao}
                onSubmit={handleSave}
                saving={saving}
                saveStatus={saveStatus}
              />

              <FaturasAusentesSummary foundIds={foundIds} resultsById={resultsById} />
            </div>
          </div>

          <FaturaRelatorioTable relatorio={relatorio} onOpenPdf={setPdfModalUrl} />
        </>
      )}

      {pdfModalUrl && (
        <FaturaPdfModal
          url={pdfModalUrl}
          companyId={details?.unidade?.concessionaria_concessionariaId}
          onClose={() => setPdfModalUrl(null)}
        />
      )}
    </div>
  );
}
