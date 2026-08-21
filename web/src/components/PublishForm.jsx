import { useEffect, useState } from "react";

const DEFAULT_PAYLOAD = {
  companyId: 137,
  credential: {
    id: 27535,
    username: "893.381.389-68",
    password: "",
    birthdate: "1973-09-06T00:00:00.000Z",
    cpf: null,
    statusCredencial: 2,
    installationCode: "0001932072701247",
    newInstallationNumber: "0001932072701247",
    clientCode: "0001932072701247",
    contractCode: "0001932072701247",
    isCompany: 0,
    userId: 94504,
    unityId: 935992,
    integratorId: 65638,
    concessionaireName: "EQUATORIAL GO",
    tariffGroup: "B",
    email: "",
  },
  dev: false,
  base64: true,
  isPortalAuth: false,
  priority: 0,
};

export default function PublishForm({ queues, onPublish }) {
  const [queue, setQueue] = useState(queues[0]?.name || "");
  const [priority, setPriority] = useState(0);
  const [text, setText] = useState(JSON.stringify(DEFAULT_PAYLOAD, null, 2));
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!queue && queues[0]) setQueue(queues[0].name);
  }, [queue, queues]);

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
