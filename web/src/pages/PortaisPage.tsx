import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  getMetricasPortal,
  getPortais,
  getTiposRequisicaoRobo,
} from "../api/portais.js";
import type {
  LogRequisicaoRobo,
  Portal,
  TipoRequisicaoRobo,
} from "../types/portais.js";
import "../css/portais-page.css";
import "../css/table.css";

const DEFAULT_TIPOS = [4, 5, 6]; // status, powerData, energyData

export default function PortaisPage() {
  const [portais, setPortais] = useState<Portal[]>([]);
  const [portaisError, setPortaisError] = useState<string | null>(null);
  const [portalId, setPortalId] = useState<number | null>(null);

  const [tipos, setTipos] = useState<TipoRequisicaoRobo[]>([]);
  const [selectedTipos, setSelectedTipos] = useState<Set<number>>(
    new Set(DEFAULT_TIPOS),
  );

  const [metricas, setMetricas] = useState<LogRequisicaoRobo[]>([]);
  const [metricasLoading, setMetricasLoading] = useState(false);
  const [metricasError, setMetricasError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const portal = portais.find((p) => p.portalId === portalId) || null;
  const tiposNomes = useMemo(
    () =>
      Object.fromEntries(
        tipos.map((t) => [t.tipoRequisicaoRoboId, t.tipoRequisicaoRoboNome]),
      ),
    [tipos],
  );

  useEffect(() => {
    getPortais()
      .then((data) => {
        setPortais(data);
        setPortalId((current) =>
          current && data.some((p) => p.portalId === current)
            ? current
            : data[0]?.portalId ?? null,
        );
      })
      .catch((error) => setPortaisError((error as Error).message));

    getTiposRequisicaoRobo()
      .then((data) => setTipos(data))
      .catch((error) => setMetricasError((error as Error).message));
  }, []);

  const refreshMetricas = useCallback(() => {
    if (!portalId || selectedTipos.size === 0) {
      setMetricas([]);
      return;
    }
    setMetricasLoading(true);
    getMetricasPortal(portalId, [...selectedTipos])
      .then((data) => {
        setMetricas(data);
        setMetricasError(null);
      })
      .catch((error) => setMetricasError((error as Error).message))
      .finally(() => setMetricasLoading(false));
  }, [portalId, selectedTipos]);

  useEffect(() => {
    refreshMetricas();
  }, [refreshMetricas]);

  function toggleTipo(tipoId: number) {
    setSelectedTipos((current) => {
      const next = new Set(current);
      if (next.has(tipoId)) next.delete(tipoId);
      else next.add(tipoId);
      return next;
    });
  }

  return (
    <div>
      <header className="app__header">
        <h1>Portais</h1>
        <select
          className="app__concessionaria"
          value={portalId ?? ""}
          onChange={(event) => setPortalId(Number(event.target.value))}
        >
          {portais.map((p) => (
            <option key={p.portalId} value={p.portalId}>
              {p.portalNome}
            </option>
          ))}
        </select>
      </header>

      {portaisError && (
        <p className="app__error">
          Não foi possível carregar os portais: {portaisError}
        </p>
      )}

      {portal && (
        <div className="portais-metricas">
          <h2>
            Falhas de requisição — {portal.portalNome}
          </h2>

          {tipos.length > 0 && (
            <div className="portais-metricas__filtros">
              {tipos.map((tipo) => (
                <label key={tipo.tipoRequisicaoRoboId}>
                  <input
                    type="checkbox"
                    checked={selectedTipos.has(tipo.tipoRequisicaoRoboId)}
                    onChange={() => toggleTipo(tipo.tipoRequisicaoRoboId)}
                  />
                  {tipo.tipoRequisicaoRoboNome}
                </label>
              ))}
            </div>
          )}

          {metricasError && <p className="app__error">{metricasError}</p>}

          {metricasLoading ? (
            <p>Carregando…</p>
          ) : selectedTipos.size === 0 ? (
            <p>Selecione ao menos um tipo de requisição.</p>
          ) : metricas.length === 0 ? (
            <p>Nenhuma falha encontrada para os filtros selecionados.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Unidade</th>
                    <th>Credencial</th>
                    <th>Tipo</th>
                    <th>Evento</th>
                    <th>Mensagem</th>
                    <th>Horário requisição</th>
                    <th>Horário registro</th>
                    <th>Resposta</th>
                  </tr>
                </thead>
                <tbody>
                  {metricas.map((log) => (
                    <Fragment key={log.logRequisicoesRobosId}>
                      <tr>
                        <td>{log.logRequisicoesRobosId}</td>
                        <td>{log.unidade}</td>
                        <td>{log.credencial}</td>
                        <td>
                          {tiposNomes[log.requisicao] ?? log.requisicao}
                        </td>
                        <td>{log.evento}</td>
                        <td>{log.eventoMensagem || "—"}</td>
                        <td>{log.horarioRequisicao}</td>
                        <td>{log.horarioRegistro}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId((current) =>
                                current === log.logRequisicoesRobosId
                                  ? null
                                  : log.logRequisicoesRobosId,
                              )
                            }
                          >
                            {expandedId === log.logRequisicoesRobosId
                              ? "Ocultar"
                              : "Ver"}
                          </button>
                        </td>
                      </tr>
                      {expandedId === log.logRequisicoesRobosId && (
                        <tr>
                          <td colSpan={9}>
                            <p className="app__error">
                              Atenção: este log pode conter credenciais em
                              texto puro.
                            </p>
                            <pre className="portais-metricas__resposta">
                              {log.respostaLog}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
