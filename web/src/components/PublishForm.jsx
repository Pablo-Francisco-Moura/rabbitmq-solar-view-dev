import { useEffect, useState } from "react";
import { getUnidadePayload } from "../api.js";

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
  const [unidadeId, setUnidadeId] = useState("");
  const [fetchingUnidade, setFetchingUnidade] = useState(false);
  const [text, setText] = useState(() =>
    JSON.stringify(buildEmptyPayload(concessionaria), null, 2),
  );
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!queues.some((item) => item.name === queue)) {
      setQueue(queues[0]?.name || "");
    }
  }, [queue, queues]);

  useEffect(() => {
    setText(JSON.stringify(buildEmptyPayload(concessionaria), null, 2));
  }, [concessionaria?.id]);

  async function handleFetchUnidade() {
    if (!unidadeId) return;
    setStatus(null);
    setFetchingUnidade(true);
    try {
      const payload = await getUnidadePayload(unidadeId);
      setText(JSON.stringify(payload, null, 2));
    } catch (error) {
      setStatus({ ok: false, message: error.message });
    } finally {
      setFetchingUnidade(false);
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

    setSubmitting(true);
    try {
      await onPublish(queue, payload, Number(priority));
      setStatus({ ok: true, message: "Mensagem publicada." });
    } catch (error) {
      setStatus({ ok: false, message: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="publish-form" onSubmit={handleSubmit}>
      <h2>Publicar mensagem</h2>

      <div className="publish-form__row">
        <label>
          Fila
          <select value={queue} onChange={(event) => setQueue(event.target.value)}>
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
          Unidade ID
          <input
            type="number"
            min={1}
            placeholder="Ex: 712383"
            value={unidadeId}
            onChange={(event) => setUnidadeId(event.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={handleFetchUnidade}
          disabled={!unidadeId || fetchingUnidade}
        >
          {fetchingUnidade ? "Buscando…" : "Buscar dados da unidade"}
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
          {submitting ? "Publicando…" : "Publicar"}
        </button>
        {status && (
          <span className={status.ok ? "status status--ok" : "status status--error"}>
            {status.message}
          </span>
        )}
      </div>
    </form>
  );
}
