import { useEffect, useMemo, useState } from "react";
import { getUnidadePayload } from "../api/unidades.js";
import { parseUnidadeIds } from "../utils/unidadeIds.js";
import "../css/publish-form.css";

function buildEmptyPayload(concessionaria) {
  return {
    companyId: Number(concessionaria?.id) || 0,
    credential: {},
    dev: false,
    base64: true,
    isPortalAuth: false,
    priority: 0,
  };
}

export default function PublishForm({ queues, concessionaria, onPublish }) {
  const [queue, setQueue] = useState(queues[0]?.name || "");
  const [priority, setPriority] = useState(0);
  const [unidadeIdsText, setUnidadeIdsText] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchDone, setFetchDone] = useState(0);
  const [text, setText] = useState(() =>
    JSON.stringify(buildEmptyPayload(concessionaria), null, 2),
  );
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(0);
  const [submitTotal, setSubmitTotal] = useState(null);
  const [copied, setCopied] = useState(false);

  const unidadeIds = useMemo(
    () => parseUnidadeIds(unidadeIdsText),
    [unidadeIdsText],
  );

  useEffect(() => {
    if (!queues.some((item) => item.name === queue)) {
      setQueue(queues[0]?.name || "");
    }
  }, [queue, queues]);

  useEffect(() => {
    setText(JSON.stringify(buildEmptyPayload(concessionaria), null, 2));
  }, [concessionaria?.id]);

  async function handleFetchUnidade() {
    if (unidadeIds.length === 0) return;
    setStatus(null);
    setFetching(true);
    setFetchDone(0);

    if (unidadeIds.length === 1) {
      try {
        const payload = await getUnidadePayload(unidadeIds[0]);
        setText(JSON.stringify(payload, null, 2));
      } catch (error) {
        setStatus({ ok: false, message: error.message });
      } finally {
        setFetching(false);
      }
      return;
    }

    const payloads = [];
    const failures = [];
    for (const id of unidadeIds) {
      try {
        payloads.push(await getUnidadePayload(id));
      } catch (error) {
        failures.push({ id, message: error.message });
      }
      setFetchDone((current) => current + 1);
    }
    setFetching(false);

    if (payloads.length > 0) setText(JSON.stringify(payloads, null, 2));
    if (failures.length === 0) {
      setStatus({
        ok: true,
        message: `${payloads.length} unidades encontradas.`,
      });
    } else {
      setStatus({
        ok: false,
        message: `${payloads.length}/${unidadeIds.length} encontradas. Falhas: ${failures
          .map((failure) => `${failure.id}: ${failure.message}`)
          .join("; ")}`,
      });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus(null);

    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      setStatus({ ok: false, message: "JSON inválido." });
      return;
    }

    if (!Array.isArray(payload)) {
      setSubmitting(true);
      setSubmitTotal(null);
      try {
        await onPublish(queue, payload, Number(priority));
        setStatus({ ok: true, message: "Mensagem publicada." });
      } catch (error) {
        setStatus({ ok: false, message: error.message });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (payload.length === 0) {
      setStatus({ ok: false, message: "A lista de mensagens está vazia." });
      return;
    }

    setSubmitting(true);
    setSubmitDone(0);
    setSubmitTotal(payload.length);
    const failures = [];
    for (let index = 0; index < payload.length; index++) {
      try {
        await onPublish(queue, payload[index], Number(priority));
      } catch (error) {
        failures.push({ index, message: error.message });
      }
      setSubmitDone((current) => current + 1);
    }
    setSubmitting(false);

    const okCount = payload.length - failures.length;
    if (failures.length === 0) {
      setStatus({ ok: true, message: `${okCount} mensagens publicadas.` });
    } else {
      setStatus({
        ok: false,
        message: `${okCount}/${payload.length} publicadas. Falhas: ${failures
          .map((failure) => `#${failure.index + 1}: ${failure.message}`)
          .join("; ")}`,
      });
    }
  }

  async function handleCopyPayload() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setStatus({
        ok: false,
        message: "Não foi possível copiar para a área de transferência.",
      });
    }
  }

  const fetchLabel =
    unidadeIds.length > 1
      ? `Buscar ${unidadeIds.length} unidades`
      : "Buscar dados da unidade";

  const submitLabel = !submitting
    ? "Publicar"
    : submitTotal != null
      ? `Publicando ${submitDone}/${submitTotal}…`
      : "Publicando…";

  return (
    <form className="publish-form" onSubmit={handleSubmit}>
      <h2>Publicar mensagem</h2>

      <div className="publish-form__row">
        <label>
          Fila
          <select
            value={queue}
            onChange={(event) => setQueue(event.target.value)}
          >
            {queues.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Prioridade (0-2)
          <input
            type="number"
            min={0}
            max={2}
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          />
        </label>
      </div>

      <div className="publish-form__row">
        <label>
          Unidade ID (uma ou várias, separadas por espaço, vírgula ou linha)
          <textarea
            rows={5}
            placeholder={"Ex: 712383\nou várias:\n97335\n931571\n931572"}
            value={unidadeIdsText}
            onChange={(event) => setUnidadeIdsText(event.target.value)}
          />
        </label>
        <button
          type="button"
          style={{ alignSelf: "flex-end" }}
          onClick={handleFetchUnidade}
          disabled={unidadeIds.length === 0 || fetching}
        >
          {fetching ? "Buscando…" : fetchLabel}
        </button>
      </div>

      <label>
        Payload (JSON)
        <textarea
          rows={18}
          spellCheck={false}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>

      <div className="publish-form__actions">
        <button type="submit" disabled={submitting}>
          {submitLabel}
        </button>
        <button type="button" onClick={handleCopyPayload} disabled={!text}>
          {copied ? "Copiado!" : "Copiar"}
        </button>
        {status && (
          <span
            className={status.ok ? "status status--ok" : "status status--error"}
          >
            {status.message}
          </span>
        )}
      </div>
    </form>
  );
}
