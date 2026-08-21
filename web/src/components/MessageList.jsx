import { useState } from "react";

function parsePayload(message) {
  if (message.payload == null) return null;
  try {
    return JSON.parse(message.payload);
  } catch {
    return null;
  }
}

export default function MessageList({
  queueName,
  messages,
  loading,
  error,
  onRefresh,
  onDelete,
}) {
  const [deletingIndex, setDeletingIndex] = useState(null);

  async function handleDelete(event, index, message) {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm("Excluir esta mensagem da fila? Essa ação não pode ser desfeita."))
      return;
    setDeletingIndex(index);
    try {
      await onDelete(index, message.payload);
    } finally {
      setDeletingIndex(null);
    }
  }

  return (
    <section className="message-list">
      <header className="message-list__header">
        <h2>
          Mensagens em <code>{queueName}</code>
        </h2>
        <button type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "Atualizando…" : "Atualizar"}
        </button>
      </header>

      {error && <p className="message-list__error">{error}</p>}

      {!error && messages.length === 0 && !loading && (
        <p className="message-list__empty">Nenhuma mensagem nesta fila.</p>
      )}

      <ul>
        {messages.map((message, index) => {
          const parsed = parsePayload(message);
          const credentialId = parsed?.credential?.id;
          const unityId = parsed?.credential?.unityId;

          return (
            <li key={message.id}>
              <details>
                <summary>
                  <div className="message-list__meta">
                    <span>
                      {message.redelivered ? "reentregue" : "original"}
                    </span>
                    {message.routingKey && (
                      <span>routing key: {message.routingKey}</span>
                    )}
                    {message.properties?.priority != null && (
                      <span>prioridade: {message.properties.priority}</span>
                    )}
                    <button
                      type="button"
                      className="message-list__delete"
                      title="Excluir mensagem"
                      aria-label="Excluir mensagem"
                      disabled={deletingIndex === index}
                      onClick={(event) => handleDelete(event, index, message)}
                    >
                      {deletingIndex === index ? "…" : "🗑"}
                    </button>
                  </div>
                  <div className="message-list__summary">
                    {credentialId != null && (
                      <span>Credencial: {credentialId}</span>
                    )}
                    {unityId != null && <span>Unidade: {unityId}</span>}
                    {credentialId == null && unityId == null && (
                      <span>Ver mensagem</span>
                    )}
                  </div>
                </summary>
                <pre>
                  {parsed ? JSON.stringify(parsed, null, 2) : message.payload}
                </pre>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
